import {
	useLoaderData,
	Link,
	Form,
	type MetaFunction,
	useActionData,
} from '@remix-run/react'
import { formatDistanceToNow } from 'date-fns'
import { type DataFunctionArgs, json, redirect } from '@remix-run/node'
import { prisma } from '#app/utils/db.server.ts'
import { Button } from '#app/components/ui/button.tsx'
import {
	getNoteImgSrc,
	invariantResponse,
	useIsPending,
} from '#app/utils/misc.tsx'
import { floatingToolbarClassName } from '#app/components/floating-toolbar.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { type loader as notesLoader } from './notes.tsx'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { validateCSRFToken } from '#app/utils/csrf.server.ts'
import { useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { z } from 'zod'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { toastSessionStorage } from '#app/utils/toast.server.ts'

export async function loader({ params }: DataFunctionArgs) {
	const note = await prisma.note.findUnique({
		where: { id: params.noteId },
		select: {
			id: true,
			title: true,
			content: true,
			ownerId: true,
			updatedAt: true,
			images: {
				select: {
					id: true,
					altText: true,
				},
			},
		},
	})

	invariantResponse(note, 'Not found', { status: 404 })

	const date = new Date(note.updatedAt)
	const timeAgo = formatDistanceToNow(date)

	return json({
		note,
		timeAgo,
	})
}

const DeleteFormSchema = z.object({
	intent: z.literal('delete-note'),
	noteId: z.string(),
})

export async function action({ params, request }: DataFunctionArgs) {
	const formData = await request.formData()
	await validateCSRFToken(formData, request.headers)
	const submission = parse(formData, {
		schema: DeleteFormSchema,
	})
	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}
	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}

	const { noteId } = submission.value

	const note = await prisma.note.findFirst({
		select: { id: true, owner: { select: { username: true } } },
		where: { id: noteId, owner: { username: params.username } },
	})
	invariantResponse(note, 'Not found', { status: 404 })

	await prisma.note.delete({ where: { id: note.id } })

	const cookie = request.headers.get('cookie')
	const cookieSession = await toastSessionStorage.getSession(cookie)
	cookieSession.flash('toast', {
		type: 'success',
		title: 'Note deleted',
		description: 'Your note has been deleted',
	})

	return redirect(`/users/${note.owner.username}/notes`, {
		headers: {
			'set-cookie': await toastSessionStorage.commitSession(cookieSession),
		},
	})
}

export default function NoteRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div className="absolute inset-0 flex flex-col px-10">
			<h2 className="mb-2 pt-12 text-h2 lg:mb-6">{data.note.title}</h2>
			<div className="overflow-y-auto pb-24">
				<ul className="flex flex-wrap gap-5 py-5">
					{data.note.images.map(image => (
						<li key={image.id}>
							<a href={getNoteImgSrc(image.id)}>
								<img
									src={getNoteImgSrc(image.id)}
									alt={image.altText ?? ''}
									className="h-32 w-32 rounded-lg object-cover"
								/>
							</a>
						</li>
					))}
				</ul>
				<p className="whitespace-break-spaces text-sm md:text-lg">
					{data.note.content}
				</p>
			</div>
			<div className={floatingToolbarClassName}>
				<span className="text-sm text-foreground/90 max-[524px]:hidden">
					<Icon name="clock" className="scale-125">
						{data.timeAgo} ago
					</Icon>
				</span>
				<div className="grid flex-1 grid-cols-2 justify-end gap-2 min-[525px]:flex md:gap-4">
					<DeleteNote id={data.note.id} />
					<Button
						asChild
						className="min-[525px]:max-md:aspect-square min-[525px]:max-md:px-0"
					>
						<Link to="edit">
							<Icon name="pencil-1" className="scale-125 max-md:scale-150">
								<span className="max-md:hidden">Edit</span>
							</Icon>
						</Link>
					</Button>
				</div>
			</div>
		</div>
	)
}

export function DeleteNote({ id }: { id: string }) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [form] = useForm({
		id: 'delete-note',
		lastSubmission: actionData?.submission,
		constraint: getFieldsetConstraint(DeleteFormSchema),
		onValidate({ formData }) {
			return parse(formData, { schema: DeleteFormSchema })
		},
	})

	return (
		<Form method="post" {...form.props}>
			<AuthenticityTokenInput />
			<input type="hidden" name="noteId" value={id} />
			<StatusButton
				type="submit"
				name="intent"
				value="delete-note"
				variant="destructive"
				status={isPending ? 'pending' : actionData?.status ?? 'idle'}
				disabled={isPending}
				className="w-full max-md:aspect-square max-md:px-0"
			>
				<Icon name="trash" className="scale-125 max-md:scale-150">
					<span className="max-md:hidden">Delete</span>
				</Icon>
			</StatusButton>
			<ErrorList errors={form.errors} id={form.errorId} />
		</Form>
	)
}

export const meta: MetaFunction<
	typeof loader,
	{ 'routes/users+/$username_+/notes': typeof notesLoader }
> = ({ data, matches }) => {
	const notesRoute = matches.find(
		m => m.id === 'routes/users+/$username_+/notes',
	)
	const displayName = notesRoute?.data.owner.name
	const noteTitle = data?.note.title ?? 'Note'
	const noteContentsSummary =
		data && data.note.content.length > 100
			? data?.note.content.slice(0, 97) + '...'
			: 'No content'
	return [
		{ title: `${noteTitle} | ${displayName}'s Notes | Epic Notes` },
		{
			name: 'description',
			content: noteContentsSummary,
		},
	]
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No note was found with the ID {params.noteId}</p>
				),
			}}
		/>
	)
}
