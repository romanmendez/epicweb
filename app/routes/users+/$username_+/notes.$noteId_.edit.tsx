import { useRef, useState } from 'react'
import {
	json,
	type DataFunctionArgs,
	redirect,
	unstable_parseMultipartFormData as parseMultipartFormData,
	unstable_createMemoryUploadHandler as createMemoryUploadHandler,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import {
	conform,
	useForm,
	useFieldset,
	type FieldConfig,
	useFieldList,
	list,
} from '@conform-to/react'
import { db, updateNote } from '#app/utils/db.server.ts'
import { cn, invariantResponse, useIsSubmitting } from '#app/utils/misc.tsx'
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

export async function loader({ params }: DataFunctionArgs) {
	const note = db.note.findFirst({
		where: {
			id: {
				equals: params.noteId,
			},
		},
	})

	invariantResponse(note, 'Note not found', { status: 404 })

	return json({
		note: {
			title: note.title,
			content: note.content,
			images: note.images.map(i => ({ id: i.id, altText: i.altText })),
		},
	})
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

const NoteEditorSchema = z.object({
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
	invariantResponse(params.noteId, 'Not a valid note Id')

	const uploadHandler = createMemoryUploadHandler({
		maxPartSize: MAX_UPLOAD_SIZE,
	})
	const formData = await parseMultipartFormData(request, uploadHandler)
	await validateCSRFToken(formData, request.headers)

	if (formData.get('intent') === 'cancel') {
		return redirect(`/users/${params.username}/notes/${params.noteId}`)
	}
	const submission = parse(formData, { schema: NoteEditorSchema })

	if (formData.get('intent') !== 'submit') {
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
	const { title, content, images } = submission.value
	await updateNote({
		id: params.noteId,
		title,
		content,
		images: images,
	})
	return redirect(`/users/${params.username}/notes/${params.noteId}`)
}

function ErrorList({
	errors,
	id,
}: {
	errors?: Array<string> | null
	id?: string
}) {
	return errors?.length ? (
		<ul className="flex flex-col gap-1" aria-aria-describedby={id}>
			{errors.map((error, i) => (
				<li key={i} className="text-foreground-danger text-[10px]">
					{error}
				</li>
			))}
		</ul>
	) : null
}

export default function NoteEdit() {
	const { note } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const isSubmitting = useIsSubmitting()
	const [form, fields] = useForm({
		id: 'login-form',
		constraint: getFieldsetConstraint(NoteEditorSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: NoteEditorSchema })
		},
		defaultValue: {
			title: note.title,
			content: note.content,
			images: note.images.length ? note.images : [{}],
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
					disabled={isSubmitting}
					status={isSubmitting ? 'pending' : 'idle'}
					form={form.id}
					name="intent"
					value="submit"
				>
					{isSubmitting ? 'Submitting' : 'Submit'}
				</StatusButton>
				<Button
					type="submit"
					form={form.id}
					variant="destructive"
					name="intent"
					value="cancel"
				>
					Cancel
				</Button>
			</div>
		</div>
	)
}

function ImageChooser({
	config,
}: {
	config: FieldConfig<z.infer<typeof ImageFieldsetSchema>>
}) {
	const ref = useRef<HTMLFieldSetElement>(null)
	const fields = useFieldset(ref, config)
	const existingImage = Boolean(fields.id.defaultValue)
	const [previewImage, setPreviewImage] = useState<string | null>(
		existingImage ? `/resources/images/${fields.id.defaultValue}` : null,
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
				404: ({ params }) => (
					<p>Something went wrong with your edit. Please try again.</p>
				),
			}}
		/>
	)
}
