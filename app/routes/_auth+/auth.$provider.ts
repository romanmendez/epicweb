import { type DataFunctionArgs, redirect } from '@remix-run/node'
import { authenticator } from '#app/utils/auth.server.ts'
import { handleMockAction } from '#app/utils/connections.server.ts'
import { ProviderNameSchema } from '#app/utils/connections.tsx'
import { getRedirectCookieHeader } from '#app/utils/redirect-cookie.server.ts'
import { getReferrerRoute } from '#app/utils/misc.tsx'

export async function loader() {
	return redirect('/login')
}

export async function action({ request, params }: DataFunctionArgs) {
	const providerName = ProviderNameSchema.parse(params.provider)

	try {
		await handleMockAction(providerName, request)
		return await authenticator.authenticate(providerName, request)
	} catch (e) {
		if (e instanceof Response) {
			const formData = await request.formData()
			const rawRedirectTo = formData.get('redirectTo')
			const redirectTo =
				typeof rawRedirectTo === 'string'
					? rawRedirectTo
					: getReferrerRoute(request)
			const redirectHeader = getRedirectCookieHeader(redirectTo)
			if (redirectHeader) {
				e.headers.append('set-cookie', redirectHeader)
			}
			return e
		}
		return e
	}
}
