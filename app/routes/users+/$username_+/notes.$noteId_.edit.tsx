import { useState } from 'react'
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
import { conform, useForm } from '@conform-to/react'
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

const titleMinLength = 5
const titleMaxLength = 50
const contentMinLength = 10
const contentMaxLength = 1000

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
})

export async function action({ request, params }: DataFunctionArgs) {
	invariantResponse(params.noteId, 'Not a valid note Id')

	const uploadHandler = createMemoryUploadHandler({
		maxPartSize: 1024 * 1024 * 3,
	})
	const formData = await parseMultipartFormData(request, uploadHandler)

	if (formData.get('intent') === 'cancel') {
		return redirect(`/users/${params.username}/notes/${params.noteId}`)
	}

	const submission = parse(formData, { schema: NoteEditorSchema })
	console.log(submission, formData.get('imageId'), formData.get('title'))

	if (!submission.value) {
		return json(
			{
				status: 'error',
				submission,
			} as const,
			{ status: 400 },
		)
	}

	const { title, content } = submission.value
	await updateNote({
		id: params.noteId,
		title,
		content,
		images: [
			{
				// @ts-expect-error
				id: formData.get('imageId') ?? '',
				// @ts-expect-error
				file: formData.get('file') ?? null,
				// @ts-expect-error
				altText: formData.get('alt-text') ?? null,
			},
		],
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
		// onValidate({ formData }) {
		// 	return parse(formData, { schema: NoteEditorSchema })
		// },
		defaultValue: {
			title: note.title,
			content: note.content,
		},
	})
	return (
		<div className="absolute inset-0">
			<Form
				method="POST"
				className="flex h-full flex-col gap-y-4 overflow-x-hidden px-10 pb-28 pt-12"
				encType="multipart/form-data"
				{...form.props}
			>
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
						<Label>Image</Label>
						<ImageChooser image={note.images[0]} />
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
					value="edit"
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
	image,
}: {
	image?: { id: string; altText?: string | null }
}) {
	const existingImage = Boolean(image)
	const [previewImage, setPreviewImage] = useState<string | null>(
		existingImage ? `/resources/images/${image?.id}` : null,
	)
	const [altText, setAltText] = useState(image?.altText ?? '')

	return (
		<fieldset>
			<div className="flex gap-3">
				<div className="w-32">
					<div className="relative h-32 w-32">
						<label
							htmlFor="image-input"
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
								<input type="hidden" name="imageId" value={image?.id} />
							) : null}
							<input
								id="image-input"
								aria-label="Image"
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
								name="file"
								type="file"
								accept="image/*"
							/>
						</label>
					</div>
				</div>
				<div className="flex-1">
					<Label htmlFor="alt-text">Alt Text</Label>
					<Textarea
						id="alt-text"
						name="alt-text"
						defaultValue={altText}
						onChange={e => setAltText(e.currentTarget.value)}
					/>
				</div>
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
