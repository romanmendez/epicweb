import { json, type DataFunctionArgs, redirect } from '@remix-run/node'
import {
	useLoaderData,
	Form,
	useNavigation,
	useFormAction,
	useActionData,
} from '@remix-run/react'
import { db } from '#app/utils/db.server.ts'
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

type ActionErrors = {
	formErrors: Array<string>
	fieldErrors: {
		title: Array<string>
		content: Array<string>
	}
}

const titleMaxLength = 100
const contentMaxLength = 1000

export async function action({ request, params }: DataFunctionArgs) {
	const formData = await request.formData()
	const title = formData.get('title')
	const content = formData.get('content')

	invariantResponse(typeof title === 'string', 'Invalid title')
	invariantResponse(typeof content === 'string', 'Invalid title')

	const errors: ActionErrors = {
		formErrors: [],
		fieldErrors: {
			title: [],
			content: [],
		},
	}

	if (title.length > titleMaxLength)
		errors.fieldErrors.title.push('Title is too long.')
	if (title === '')
		errors.fieldErrors.title.push(
			`Title must not exceed ${titleMaxLength} characters.`,
		)
	if (content.length > contentMaxLength)
		errors.fieldErrors.content.push(
			`Content must not exceed ${contentMaxLength} characters.`,
		)
	if (content === '')
		errors.fieldErrors.content.push('You need to provide some text here.')

	const contentIncludesTitleWord = title
		.toLocaleLowerCase()
		.split(' ')
		.some(word => content.toLocaleLowerCase().includes(word))

	if (!contentIncludesTitleWord)
		errors.formErrors.push(
			'The content body must contain mention of at least 1 word in the title.',
		)

	const hasErrors =
		errors.formErrors.length ||
		Object.values(errors.fieldErrors).some(fieldErrors => fieldErrors.length)

	if (hasErrors) {
		return json(
			{
				status: 'error',
				errors,
				// 🦺 the as const is here to help with our TypeScript inference
			} as const,
			{ status: 400 },
		)
	}

	db.note.update({
		where: { id: { equals: params.noteId } },
		data: { title, content },
	})
	return redirect(`/users/${params.username}/notes/${params.noteId}`)
}

function ErrorList({ errors }: { errors?: Array<string> | null }) {
	return errors?.length ? (
		<ul className="flex flex-col gap-1">
			{errors.map((error, i) => (
				<li key={i} className="text-foreground-danger text-[10px]">
					{error}
				</li>
			))}
		</ul>
	) : null
}

export default function NoteEdit() {
	const actionData = useActionData<typeof action>()
	const data = useLoaderData<typeof loader>()
	const isSubmitting = useIsSubmitting()
	const formId = 'note-editor'

	const fieldErrors =
		actionData?.status === 'error' ? actionData.errors.fieldErrors : null
	const formErrors =
		actionData?.status === 'error' ? actionData.errors.formErrors : null

	return (
		<div className="absolute inset-0">
			<Form
				method="POST"
				className="flex h-full flex-col gap-y-4 overflow-x-hidden px-10 pb-28 pt-12"
				noValidate
				id={formId}
			>
				<div className="flex flex-col gap-1">
					<div>
						<Label>Title</Label>
						<Input
							name="title"
							defaultValue={data.note.title}
							// maxLength={titleMaxLength}
							required
						/>
						<div className="min-h-[32px] px-4 pb-3 pt-1">
							<ErrorList errors={fieldErrors?.title} />
						</div>
					</div>
					<div>
						<Label>Content</Label>
						<Textarea
							name="content"
							defaultValue={data.note.content}
							// maxLength={contentMaxLength}
							required
						/>
						<div className="min-h-[32px] px-4 pb-3 pt-1">
							<ErrorList errors={fieldErrors?.content} />
						</div>
					</div>
				</div>
				<div className="min-h-[32px] px-4 pb-3 pt-1">
					<ErrorList errors={formErrors} />
				</div>
			</Form>
			<div className={floatingToolbarClassName}>
				<StatusButton
					type="submit"
					disabled={isSubmitting}
					status={isSubmitting ? 'pending' : 'idle'}
					form={formId}
				>
					{isSubmitting ? 'Submitting' : 'Submit'}
				</StatusButton>
				<Button type="reset">Reset</Button>
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
