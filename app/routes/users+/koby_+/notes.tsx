import { Outlet, Link, NavLink } from '@remix-run/react'

export default function NotesRoute() {
	return (
		<div className="flex h-full justify-between pb-12 border-8 border-blue-500">
			<div className="text-h1">Notes</div>
			<Link to="../" relative="path">
				Back
			</Link>
			<NavLink
				to="./some-note-id"
				className={({ isActive }) => `underline ${isActive ? 'bg-accent' : ''}`}
			>
				Some note
			</NavLink>
			<Outlet />
		</div>
	)
}
