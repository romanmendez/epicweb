import {
	json,
	type DataFunctionArgs,
	redirect,
	unstable_parseMultipartFormData as parseMultipartFormData,
	unstable_createMemoryUploadHandler as createMemoryUploadHandler,
	type SerializeFrom,
} from '@remix-run/node'
import { Form, Link, useFetcher } from '@remix-run/react'
import { z } from 'zod'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { createId as cuid } from '@paralleldrive/cuid2'
import {
	conform,
	useForm,
	useFieldset,
	type FieldConfig,
	useFieldList,
	list,
} from '@conform-to/react'
import { prisma } from '#app/utils/db.server.ts'
import { cn, getNoteImgSrc, invariantResponse } from '#app/utils/misc.tsx'
import {
	Button,
	Label,
	Input,
	Textarea,
	StatusButton,
} from '#app/components/ui/index.tsx'
import { floatingToolbarClassName } from '#app/components/floating-toolbar.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { validateCSRFToken } from '#app/utils/csrf.server.ts'
import { type Note, type NoteImage } from '@prisma/client'
import { useRef, useState } from 'react'

export async function loader({ params }: DataFunctionArgs) {
	const note = await prisma.note.findFirst({
		where: { id: params.noteId },
		select: {
			title: true,
			content: true,
			images: {
				select: { id: true, altText: true },
			},
		},
	})

	invariantResponse(note, 'Note not found', { status: 404 })

	return json({ note })
}

const MAX_UPLOAD_SIZE = 1024 * 1024 * 3 // 3MB

const titleMinLength = 5
const titleMaxLength = 50
const contentMinLength = 10
const contentMaxLength = 1000

const ImageFieldsetSchema = z.object({
	id: z.string().optional(),
	file: z
		.instanceof(File)
		.refine(
			file => file.size < MAX_UPLOAD_SIZE,
			'File is too large. Max size is 5MB',
		)
		.optional(),
	altText: z.string().optional(),
})

type ImageFieldset = z.infer<typeof ImageFieldsetSchema>

function imageHasFile(
	image: ImageFieldset,
): image is ImageFieldset & { file: NonNullable<ImageFieldset['file']> } {
	return Boolean(image.file?.size && image.file?.size > 0)
}

function imageHasId(
	image: ImageFieldset,
): image is ImageFieldset & { id: NonNullable<ImageFieldset['id']> } {
	return image.id != null
}

const NoteEditorSchema = z.object({
	id: z.string().optional(),
	title: z
		.string({ required_error: 'Title is required' })
		.min(
			titleMinLength,
			`Title must have a minimum of ${titleMinLength} characters`,
		)
		.max(
			titleMaxLength,
			`Title must be a maximum of ${titleMaxLength} characters`,
		),
	content: z
		.string({ required_error: 'Title is required' })
		.min(
			contentMinLength,
			`Content must have a minimum of ${contentMinLength} characters`,
		)
		.max(contentMaxLength),
	images: z.array(ImageFieldsetSchema),
})

export async function action({ request, params }: DataFunctionArgs) {
	const uploadHandler = createMemoryUploadHandler({
		maxPartSize: MAX_UPLOAD_SIZE,
	})
	const formData = await parseMultipartFormData(request, uploadHandler)
	await validateCSRFToken(formData, request.headers)

	const submission = await parse(formData, {
		schema: NoteEditorSchema.transform(async ({ images = [], ...data }) => {
			return {
				...data,
				imageUpdates: await Promise.all(
					images.filter(imageHasId).map(async i => {
						if (imageHasFile(i)) {
							return {
								id: i.id,
								altText: i.altText,
								contentType: i.file.type,
								blob: Buffer.from(await i.file.arrayBuffer()),
							}
						} else {
							return { id: i.id, altText: i.altText }
						}
					}),
				),
				newImages: await Promise.all(
					images
						.filter(imageHasFile)
						.filter(i => !i.id)
						.map(async image => {
							return {
								altText: image.altText,
								contentType: image.file.type,
								blob: Buffer.from(await image.file.arrayBuffer()),
							}
						}),
				),
			}
		}),
		async: true,
	})

	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}

	if (!submission.value) {
		return json(
			{
				status: 'error',
				submission,
			} as const,
			{ status: 400 },
		)
	}
	const {
		id: noteId,
		title,
		content,
		imageUpdates = [],
		newImages = [],
	} = submission.value

	const updatedNote = await prisma.note.upsert({
		select: { id: true, owner: { select: { username: true } } },
		where: { id: noteId ?? '__new_note__' },
		create: {
			owner: { connect: { username: params.username } },
			title,
			content,
			images: { create: newImages },
		},
		update: {
			title,
			content,
			images: {
				deleteMany: {
					id: { notIn: imageUpdates.map(i => i.id) },
				},
				updateMany: imageUpdates.map(i => ({
					where: { id: i.id },
					data: { ...i, id: i.blob ? cuid() : i.id },
				})),
				create: newImages,
			},
		},
	})

	return redirect(
		`/users/${updatedNote.owner.username}/notes/${updatedNote.id}`,
	)
}

function ErrorList({
	errors,
	id,
}: {
	errors?: Array<string> | null
	id?: string
}) {
	return errors?.length ? (
		<ul className="flex flex-col gap-1" aria-describedby={id}>
			{errors.map((error, i) => (
				<li key={i} className="text-foreground-danger text-[10px]">
					{error}
				</li>
			))}
		</ul>
	) : null
}

export function NoteEditor({
	note,
}: {
	note?: SerializeFrom<
		Pick<Note, 'id' | 'title' | 'content'> & {
			images: Array<Pick<NoteImage, 'id' | 'altText'>>
		}
	>
}) {
	const noteFetcher = useFetcher<typeof action>()
	const isPending = noteFetcher.state !== 'idle'

	const [form, fields] = useForm({
		id: 'login-form',
		constraint: getFieldsetConstraint(NoteEditorSchema),
		lastSubmission: noteFetcher.data?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: NoteEditorSchema })
		},
		defaultValue: {
			title: note?.title ?? '',
			content: note?.content ?? '',
			images: note?.images.length ?? [{}],
		},
	})
	const images = useFieldList(form.ref, fields.images)

	return (
		<div className="absolute inset-0">
			<Form
				method="POST"
				className="flex h-full flex-col gap-y-4 overflow-x-hidden px-10 pb-28 pt-12"
				encType="multipart/form-data"
				{...form.props}
			>
				<AuthenticityTokenInput />
				<button type="submit" className="hidden" name="intent" value="submit" />
				{note ? <input type="hidden" name="id" value={note.id} /> : null}
				<div className="flex flex-col gap-1">
					<div>
						<Label htmlFor={fields.title.id}>Title</Label>
						<Input {...conform.input(fields.title)} autoFocus />
						<div className="min-h-[32px] px-4 pb-3 pt-1">
							<ErrorList errors={fields.title.errors} id={fields.title.id} />
						</div>
					</div>
					<div>
						<Label htmlFor={fields.content.id}>Content</Label>
						<Textarea {...conform.input(fields.content)} />
						<div className="min-h-[32px] px-4 pb-3 pt-1">
							<ErrorList
								errors={fields.content.errors}
								id={fields.content.id}
							/>
						</div>
					</div>
					<div>
						<Label>Images</Label>
						<ul className="flex flex-col gap-4">
							{images.map((image, index) => {
								return (
									<li
										key={image.key}
										className="relative border-b-2 border-muted-foreground"
									>
										<ImageChooser config={image} />
										<button
											className="text-foreground-destructive absolute right-0 top-0"
											{...list.remove(fields.images.name, { index })}
										>
											<span className="sr-only">Remove image {index + 1}</span>
											<span aria-hidden="true">❌</span>
										</button>
									</li>
								)
							})}
							<Button
								{...list.insert(fields.images.name, { defaultValue: {} })}
							>
								<span className="sr-only">Add image</span>
								<span aria-hidden="true">Add ➕</span>
							</Button>
						</ul>
					</div>
				</div>
				<div className="min-h-[32px] px-4 pb-3 pt-1">
					<ErrorList errors={form.errors} id={form.id} />
				</div>
			</Form>
			<div className={floatingToolbarClassName}>
				<StatusButton
					type="submit"
					disabled={isPending}
					status={isPending ? 'pending' : 'idle'}
					form={form.id}
					name="intent"
					value="submit"
				>
					{isPending ? 'Submitting' : 'Submit'}
				</StatusButton>
				<Link to="../" relative="path">
					Cancel
				</Link>
			</div>
		</div>
	)
}

function ImageChooser({ config }: { config: FieldConfig<ImageFieldset> }) {
	const ref = useRef<HTMLFieldSetElement>(null)
	const fields = useFieldset(ref, config)
	const existingImage = Boolean(fields.id.defaultValue)
	const [previewImage, setPreviewImage] = useState<string | null>(
		fields.id.defaultValue ? getNoteImgSrc(fields.id.defaultValue) : null,
	)
	const [altText, setAltText] = useState(fields.altText.defaultValue ?? '')
	return (
		<fieldset ref={ref}>
			<div className="flex gap-3">
				<div className="w-32">
					<div className="relative h-32 w-32">
						<label
							htmlFor={fields.id.id}
							className={cn('group absolute h-32 w-32 rounded-lg', {
								'bg-accent opacity-40 focus-within:opacity-100 hover:opacity-100':
									!previewImage,
								'cursor-pointer focus-within:ring-4': !existingImage,
							})}
						>
							{previewImage ? (
								<div className="relative">
									<img
										src={previewImage}
										alt={altText ?? ''}
										className="h-32 w-32 rounded-lg object-cover"
									/>
									{existingImage ? null : (
										<div className="pointer-events-none absolute -right-0.5 -top-0.5 rotate-12 rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground shadow-md">
											new
										</div>
									)}
								</div>
							) : (
								<div className="flex h-32 w-32 items-center justify-center rounded-lg border border-muted-foreground text-4xl text-muted-foreground">
									➕
								</div>
							)}
							{existingImage ? (
								<input {...conform.input(fields.id, { type: 'hidden' })} />
							) : null}
							<input
								{...conform.input(fields.file, { type: 'file' })}
								accept="image/*"
								className="absolute left-0 top-0 z-0 h-32 w-32 cursor-pointer opacity-0"
								onChange={event => {
									const file = event.target.files?.[0]

									if (file) {
										const reader = new FileReader()
										reader.onloadend = () => {
											setPreviewImage(reader.result as string)
										}
										reader.readAsDataURL(file)
									} else {
										setPreviewImage(null)
									}
								}}
							/>
						</label>
					</div>
					<div className="min-h-[32px] px-4 pb-3 pt-1">
						<ErrorList errors={fields.file.errors} id={fields.file.id} />
					</div>
				</div>
				<div className="flex-1">
					<Label htmlFor={fields.altText.id}>Alt Text</Label>
					<Textarea
						{...conform.textarea(fields.altText)}
						onChange={e => setAltText(e.currentTarget.value)}
					/>
					<div className="min-h-[32px] px-4 pb-3 pt-1">
						<ErrorList errors={fields.altText.errors} id={fields.altText.id} />
					</div>
				</div>
			</div>
			<div className="min-h-[32px] px-4 pb-3 pt-1">
				<ErrorList id={config.errorId} errors={config.errors} />
			</div>
		</fieldset>
	)
}
export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => (
					<p>Something went wrong with your edit. Please try again.</p>
				),
			}}
		/>
	)
}
