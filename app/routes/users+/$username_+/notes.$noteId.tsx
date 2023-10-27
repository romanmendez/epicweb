import { useLoaderData, useParams } from '@remix-run/react'
import { type DataFunctionArgs, json } from '@remix-run/node'
import { db } from '#utils/db.server.ts'
import { invariantResponse } from '#utils/misc.tsx'

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
		</div>
	)
}
