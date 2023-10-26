import { Link, useLoaderData, useParams } from '@remix-run/react'
import { type DataFunctionArgs, json } from '@remix-run/node'
import { db } from '#utils/db.server.ts'
import _ from 'lodash'

export async function loader({ params }: DataFunctionArgs) {
	const { username } = params
	const user = db.user.findFirst({
		where: {
			username: { equals: username },
		},
	})
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
			<Link to="./notes">Notes</Link>
		</div>
	)
}
