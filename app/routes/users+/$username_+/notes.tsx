import { type DataFunctionArgs, json } from '@remix-run/node'
import { Outlet, Link, NavLink, useLoaderData } from '@remix-run/react'
import { useParams } from '@remix-run/react'
import { cn, invariantResponse } from '#app/utils/misc.tsx'
import { db } from '#app/utils/db.server.ts'
import _ from 'lodash'

export async function loader({ params }: DataFunctionArgs) {
	const { username } = params
	const owner = db.user.findFirst({
		where: {
			username: { equals: username },
		},
	})

	invariantResponse(owner, `User ${username} not found`, { status: 404 })

	const notes = db.note
		.findMany({
			where: {
				owner: {
					username: { equals: username },
				},
			},
		})
		.map(({ id, title }) => ({ id, title }))
	return json({ owner, notes })
}

export default function NotesRoute() {
	const data = useLoaderData<typeof loader>()
	const userDisplayName = data.owner.name ?? data.owner.username
	const navLinkDefaultClassName =
		'line-clamp-2 block rounded py-2 pl-8 pr-6 text-base lg:text-xl'

	return (
		<main className="container flex h-full min-h-[400px] pb-12 px-0 md:px-8">
			<div className="grid w-full grid-cols-4 bg-muted pl-2 md:container md:mx-2 md:rounded md:pr-0">
				<div className="relative col-span-1">
					<div className="absolute inset-0 flex flex-col">
						<Link
							to={`/users/${data.owner.username}/notes`}
							className="pb-4 pl-8 pr-4 pt-12"
						>
							<h1 className="text-base font-bold md:text-lg lg:text-left lg:text-2xl">
								{userDisplayName}'s Notes
							</h1>
						</Link>
						<ul className="overflow-y-auto overflow-x-hidden pb-12">
							{data.notes.map(note => (
								<li className="p-1 pr-0" key={note.id}>
									<NavLink
										to={note.id}
										preventScrollReset
										prefetch="intent"
										className={({ isActive }) =>
											cn(navLinkDefaultClassName, isActive && 'bg-accent')
										}
									>
										{note.title}
									</NavLink>
								</li>
							))}
						</ul>
					</div>
				</div>
				<div className="relative col-span-3 bg-accent md:rounded">
					<Outlet />
				</div>
			</div>
		</main>
	)
}
