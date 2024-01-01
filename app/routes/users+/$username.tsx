import { json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'

export async function loader() {
	return json({ greeting: 'Hello, world!' })
}

export default function ProfileRoute() {
	const data = useLoaderData<typeof loader>()
	return <output>{data.greeting}</output>
}
