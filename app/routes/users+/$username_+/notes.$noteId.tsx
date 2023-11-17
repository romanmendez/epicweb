import { useLoaderData, Link, Form, type MetaFunction } from '@remix-run/react'
import { type DataFunctionArgs, json, redirect } from '@remix-run/node'
import { prisma } from '#app/utils/db.server.ts'
import { Button } from '#app/components/ui/button.tsx'
import { getNoteImgSrc, invariantResponse } from '#app/utils/misc.tsx'
import { floatingToolbarClassName } from '#app/components/floating-toolbar.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { type loader as notesLoader } from './notes.tsx'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { validateCSRFToken } from '#app/utils/csrf.server.ts'

export async function loader({ params }: DataFunctionArgs) {
	const { noteId } = params
	const note = await prisma.note.findUnique({
		where: {
			id: noteId,
		},
		select: {
			images: true,
			title: true,
			content: true,
		},
	})
	invariantResponse(note, `note ${noteId} not found`, { status: 404 })
	return json({ note })
}

export async function action({ params, request }: DataFunctionArgs) {
	const formData = await request.formData()
	const intent = formData.get('intent')

	await validateCSRFToken(formData, request.headers)

	if (intent === 'delete') {
		await prisma.note.delete({ where: { id: params.noteId } })
	}
	return redirect(`/users/${params.username}/notes`)
}

export default function SomeNoteId() {
	const { note } = useLoaderData<typeof loader>()
	return (
		<div className="absolute inset-0 flex flex-col px-10">
			<h2 className="mb-2 pt-12 text-h2 lg:mb-6">{note.title}</h2>
			<div className="overflow-y-auto pb-24">
				<ul className="flex flex-wrap gap-5 py-5">
					{note.images.map(image => (
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
					{note.content}
				</p>
			</div>
			<div className={floatingToolbarClassName}>
				<Form method="POST">
					<AuthenticityTokenInput />
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
