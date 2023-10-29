import {
	Link,
	useLoaderData,
	useParams,
	useRouteError,
	type MetaFunction,
	type ErrorResponse,
	isRouteErrorResponse,
} from '@remix-run/react'
import { type DataFunctionArgs, json } from '@remix-run/node'
import { db } from '#app/utils/db.server.ts'
import { invariantResponse, getErrorMessage } from '#app/utils/misc.tsx'
import _ from 'lodash'

export async function loader({ params }: DataFunctionArgs) {
	const { username } = params
	const user = db.user.findFirst({
		where: {
			username: { equals: username },
		},
	})
	invariantResponse(user, `${username} username not found`, { status: 404 })

	return json({
		user: {
			name: user.name,
			username: user.username,
		},
	})
}

export default function profileRoute() {
	const { user } = useLoaderData<typeof loader>()
	return (
		<div className="container mb-48 mt-36 border-4 border-green-500">
			<div className="text-h1">{user.name ?? user.username}</div>
			<Link to="./notes" prefetch="intent">
				Notes
			</Link>
		</div>
	)
}

export const meta: MetaFunction<typeof loader> = ({ data, params }) => {
	const displayName = data?.user.name ?? params.username
	return [
		{ title: `${displayName} | Epic Notes` },
		{ name: 'description', content: `${displayName}'s profile page` },
	]
}

export function ErrorBoundary() {
	const error = useRouteError()
	const params = useParams()
	const errorMsg = getErrorMessage(error)

	return (
		<div className="container mx-auto flex h-full w-full items-center justify-center bg-destructive p-20 text-h2 text-destructive-foreground">
			{errorMsg}
		</div>
	)
}
