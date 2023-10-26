import { Link, useParams } from '@remix-run/react'
import _ from 'lodash'

export default function KodyProfileRoute() {
	const params = useParams()
	const capitalizedUsername = _.capitalize(params.username)

	return (
		<div className="container mb-48 mt-36 border-4 border-green-500">
			<div className="text-h1">{capitalizedUsername}</div>
			<Link to="./notes">Notes</Link>
		</div>
	)
}
