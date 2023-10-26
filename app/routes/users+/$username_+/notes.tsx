import { Outlet, Link, NavLink } from '@remix-run/react'
import { useParams } from '@remix-run/react'

export default function NotesRoute() {
	const params = useParams()
	const notes = ['note one', 'note two']

	return (
		<div className="flex h-full justify-between pb-12 border-8 border-blue-500">
			<div className="text-h1">Notes</div>
			<Link to="../" relative="path">
				Back
			</Link>
			<div>
				{notes.map(note => (
					<NavLink
						key={note}
						to={note}
						className={({ isActive }) =>
							`underline ${isActive ? 'bg-accent' : ''}`
						}
					>
						{note}
					</NavLink>
				))}
			</div>
			<Outlet />
		</div>
	)
}
