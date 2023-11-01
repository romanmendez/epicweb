import { json, type DataFunctionArgs, redirect } from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { conform, useForm } from '@conform-to/react'
import { db, updateNote } from '#app/utils/db.server.ts'
import { invariantResponse, useIsSubmitting } from '#app/utils/misc.tsx'
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
		note: { title: note.title, content: note.content },
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
	const formData = await request.formData()

	if (formData.get('intent') === 'cancel') {
		return redirect(`/users/${params.username}/notes/${params.noteId}`)
	}

	const submission = parse(formData, { schema: NoteEditorSchema })

	if (!submission.value) {
		return json(
			{
				status: 'error',
				submission,
				// 🦺 the as const is here to help with our TypeScript inference
			} as const,
			{ status: 400 },
		)
	}

	const { title, content } = submission.value

	await updateNote({ id: params.noteId, title, content })
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
		},
	})

	return (
		<div className="absolute inset-0">
			<Form
				method="POST"
				className="flex h-full flex-col gap-y-4 overflow-x-hidden px-10 pb-28 pt-12"
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
