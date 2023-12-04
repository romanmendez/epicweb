import { json, type DataFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'
import { NoteEditor, action } from './__note-editor.tsx'
import { requireUserWithPermissions } from '#app/utils/permissions.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'

export { action }

export async function loader({ request, params }: DataFunctionArgs) {
	const userId = await getUserId(request)
	const note = await prisma.note.findFirst({
		select: {
			id: true,
			title: true,
			content: true,
			ownerId: true,
			images: {
				select: {
					id: true,
					altText: true,
				},
			},
		},
		where: {
			id: params.noteId,
			owner: { username: params.username },
		},
	})
	invariantResponse(note, 'Not found', { status: 404 })

	const isOwner = userId === note.ownerId
	await requireUserWithPermissions(
		request,
		isOwner ? 'update:note:own' : 'update:note:any',
	)
	return json({ note })
}

export default function NoteEdit() {
	const data = useLoaderData<typeof loader>()

	return <NoteEditor note={data.note} />
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>Yeah, you can't be here...</p>,
			}}
		/>
	)
}
