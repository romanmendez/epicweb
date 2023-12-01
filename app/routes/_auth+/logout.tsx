import { type DataFunctionArgs, redirect } from '@remix-run/node'
import { logout } from '#app/utils/auth.server.ts'

export async function loader() {
	return redirect('/')
}

export async function action({ request }: DataFunctionArgs) {
	throw await logout({ request })
}
