import { Link } from '@remix-run/react'

export default function KodyProfileRoute() {
	return (
		<div className="container mb-48 mt-36 border-4 border-green-500">
			<div className="text-h1">Kody</div>
			<Link to="./notes">Notes</Link>
		</div>
	)
}
