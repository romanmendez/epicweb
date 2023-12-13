import { authenticator } from '#app/utils/auth.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type DataFunctionArgs } from '@remix-run/node'

export async function loader({ request }: DataFunctionArgs) {
	const auth = await authenticator.authenticate('github', request, {
		throwOnError: true,
	})
	console.log(auth)

	throw await redirectWithToast('/login', {
		title: 'Auth Success (jk)',
		description: `You have successfully authenticated with GitHub (not really though...).`,
		type: 'success',
	})
}
