import { useLoaderData, Link, Form, type MetaFunction } from '@remix-run/react'
import { type DataFunctionArgs, json, redirect } from '@remix-run/node'
import { db } from '#app/utils/db.server.ts'
import { Button } from '#app/components/ui/button.tsx'
import { invariantResponse } from '#app/utils/misc.tsx'
import { floatingToolbarClassName } from '#app/components/floating-toolbar.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { loader as notesLoader } from './notes.tsx'

export async function loader({ params }: DataFunctionArgs) {
	const { noteId } = params
	const note = db.note.findFirst({
		where: {
			id: { equals: noteId },
		},
	})
	invariantResponse(note, `note ${noteId} not found`, { status: 404 })
	return json({ note })
}

export async function action({ params, request }: DataFunctionArgs) {
	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'delete') {
		db.note.delete({ where: { id: { equals: params.noteId } } })
	}
	return redirect(`/users/${params.username}/notes`)
}

export default function SomeNoteId() {
	const { note } = useLoaderData<typeof loader>()
	return (
		<div className="absolute inset-0 flex flex-col px-10">
			<h2 className="mb-2 pt-12 text-h2 lg:mb-6">{note.title}</h2>
			<div className="overflow-y-auto pb-24">
				<p className="whitespace-break-spaces text-sm md:text-lg">
					{note.content}
				</p>
			</div>
			<div className={floatingToolbarClassName}>
				<Form method="POST">
					<Button
						type="submit"
						variant="destructive"
						name="intent"
						value="delete"
					>
						Delete
					</Button>
				</Form>
				<Button asChild>
					<Link to="edit">Edit</Link>
				</Button>
			</div>
		</div>
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
