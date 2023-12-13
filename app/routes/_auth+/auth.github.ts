import { type DataFunctionArgs, redirect } from '@remix-run/node'
import { authenticator } from '#app/utils/auth.server.ts'
import { connectionSessionStorage } from '#app/utils/connections.server.ts'
import { createId as cuid } from '@paralleldrive/cuid2'

export async function loader() {
	return redirect('/login')
}

export async function action({ request }: DataFunctionArgs) {
	const providerName = 'github'

	const mockEnv = process.env.GITHUB_CLIENT_ID.startsWith('MOCK_')
	if (mockEnv) {
		const state = cuid()
		const code = 'MOCK_GITHUB_CODE_KODY'
		const connectionSession = await connectionSessionStorage.getSession(
			request.headers.get('cookie'),
		)
		connectionSession.set('oauth2:state', state)
		const searchParams = new URLSearchParams({ code, state })
		throw redirect(`/auth/github/callback?${searchParams}`, {
			headers: {
				'set-cookie':
					await connectionSessionStorage.commitSession(connectionSession),
			},
		})
	}

	const auth = await authenticator.authenticate(providerName, request)
	console.log(auth)
	return auth
}
