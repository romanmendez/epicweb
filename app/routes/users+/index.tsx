import { json, redirect, type DataFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { SearchBar } from '#app/components/search-bar.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { cn, getUserImgSrc, useDelayedIsPending } from '#app/utils/misc.tsx'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'

export async function loader({ request }: DataFunctionArgs) {
	const searchTerm = new URL(request.url).searchParams.get('search')
	if (searchTerm === '') {
		return redirect('/users')
	}
	const UserSchema = z.object({
		id: z.string(),
		name: z.string().nullable(),
		username: z.string(),
		imageId: z.string().nullable(),
	})
	const UsersSchema = z.array(UserSchema)

	const like = `%${searchTerm ?? ''}%`
	const rawUsers = await prisma.$queryRaw`
		SELECT 
				User.id, 
				User.name, 
				User.username, 
				UserImage.id as imageId
		FROM 
				User 
		LEFT JOIN 
				UserImage ON UserImage.userId = User.id
		LEFT JOIN (
				SELECT 
						ownerId, 
						MAX(updatedAt) as lastUpdated
				FROM 
						Note
				GROUP BY 
						ownerId
		) as RecentNote ON User.id = RecentNote.ownerId
		WHERE 
				User.username LIKE ${like} OR User.name LIKE ${like}
		ORDER BY 
				RecentNote.lastUpdated DESC
		LIMIT 50;
	`
	const results = UsersSchema.safeParse(rawUsers)
	console.log(results)
	if (!results.success) {
		console.log(results.error)
		return json({ status: 'error', error: results.error.message } as const, {
			status: 400,
		})
	}
	return json({
		status: 'idle',
		users: results.data,
	} as const)
}

export default function UsersRoute() {
	const data = useLoaderData<typeof loader>()
	const isPending = useDelayedIsPending({
		formMethod: 'GET',
		formAction: '/users',
	})
	if (data.status === 'error') {
		console.error(data.error)
	}

	return (
		<div className="container mb-48 mt-36 flex flex-col items-center justify-center gap-6">
			<h1 className="text-h1">Epic Notes Users</h1>
			<div className="w-full max-w-[700px] ">
				<SearchBar status={data.status} autoFocus autoSubmit />
			</div>
			<main>
				{data.status === 'idle' ? (
					data.users.length ? (
						<ul
							className={cn(
								'flex w-full flex-wrap items-center justify-center gap-4 delay-200',
								{ 'opacity-50': isPending },
							)}
						>
							{data.users.map(user => (
								<li key={user.id}>
									<Link
										to={user.username}
										className="flex h-36 w-44 flex-col items-center justify-center rounded-lg bg-muted px-5 py-3"
									>
										<img
											alt={user.name ?? user.username}
											src={getUserImgSrc(user.imageId)}
											className="h-16 w-16 rounded-full"
										/>
										{user.name ? (
											<span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-body-md">
												{user.name}
											</span>
										) : null}
										<span className="w-full overflow-hidden text-ellipsis text-center text-body-sm text-muted-foreground">
											{user.username}
										</span>
									</Link>
								</li>
							))}
						</ul>
					) : (
						<p>No users found</p>
					)
				) : data.status === 'error' ? (
					<ErrorList errors={['There was an error parsing the results']} />
				) : null}
			</main>
		</div>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
