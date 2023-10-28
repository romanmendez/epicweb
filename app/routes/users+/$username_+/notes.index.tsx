import { type MetaFunction } from '@remix-run/react'
import { type loader as notesLoader } from './notes.tsx'

export default function NotesIndexRoute() {
	return (
		<div className="container pt-12">
			<p className="text-body-md">Select a note</p>
		</div>
	)
}

// 🦺 check the note below for making this type safe
export const meta: MetaFunction<
	null,
	{ 'routes/users+/$username_+/notes': typeof notesLoader }
> = ({ params, matches }) => {
	const notesRoute = matches.find(
		route => route.id === 'routes/users+/$username_+/notes',
	)
	const displayName = notesRoute?.data.owner.name ?? params.username
	const noteCount = notesRoute?.data.notes.length ?? 0
	const notesText = noteCount === 1 ? 'note' : 'notes'
	return [
		{ title: `${displayName}'s Notes | Epic Notes` },
		{
			name: 'description',
			content: `Checkout ${displayName}'s ${noteCount} ${notesText} on Epic Notes`,
		},
	]
}
