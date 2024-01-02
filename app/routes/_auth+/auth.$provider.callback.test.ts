import { http } from 'msw'
import * as setCookieParser from 'set-cookie-parser'
import { server } from '#tests/mocks/index.ts'
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { loader } from './auth.$provider.callback.ts'
import { faker } from '@faker-js/faker'
import { connectionSessionStorage } from '#app/utils/connections.server.ts'
import { consoleError } from '#tests/setup/setup-test-env.ts'
import { invariant } from '#app/utils/misc.tsx'

const ROUTE_PATH = '/auth/github/callback'
const PARAMS = { provider: 'github' }
const BASE_URL = 'https://www.epicstack.dev'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('a new user goes to onboarding', async () => {
	const url = new URL(ROUTE_PATH, BASE_URL)
	const request = await createOAuthRequest(url)
	const response = await loader({ request, params: PARAMS, context: {} })

	assertRedirect(response, '/onboarding/github')
})

test('github auth failure', async () => {
	consoleError.mockImplementation(() => {})
	server.use(
		http.post('https://github.com/login/oauth/access_token', () => {
			return new Response('error', { status: 400 })
		}),
	)
	const url = new URL(ROUTE_PATH, BASE_URL)
	const request = await createOAuthRequest(url)
	const response = await loader({ request, params: PARAMS, context: {} }).catch(
		e => e,
	)

	expect(response.headers.get('location')).toBe('/login')
	assertToastSent(response)
	expect(consoleError).toHaveBeenCalledTimes(1)
	consoleError.mockClear()
})

async function createOAuthRequest(url: URL) {
	const state = faker.string.uuid()
	const code = faker.string.uuid()
	url.searchParams.set('code', code)
	url.searchParams.set('state', state)

	const connectionSession = await connectionSessionStorage.getSession()
	connectionSession.set('oauth2:state', state)
	const setCookie =
		await connectionSessionStorage.commitSession(connectionSession)

	return new Request(url.toString(), {
		method: 'GET',
		headers: {
			cookie: convertSetCookieToCookie(setCookie),
		},
	})
}

function assertToastSent(response: Response) {
	const setCookie = response.headers.get('set-cookie')
	invariant(setCookie, 'set-cookie should be set')
	const parsedCookie = setCookieParser.splitCookiesString([setCookie])
	expect(parsedCookie).toEqual(
		expect.arrayContaining([expect.stringContaining('en_toast')]),
	)
}

function assertRedirect(response: Response, redirectTo: string) {
	expect(response.status).toBeGreaterThanOrEqual(300)
	expect(response.status).toBeLessThan(400)
	expect(response.headers.get('location')).toBe(redirectTo)
}

function convertSetCookieToCookie(setCookie: string) {
	const parsedCookie = setCookieParser.parseString(setCookie)
	return new URLSearchParams({
		[parsedCookie.name]: parsedCookie.value,
	}).toString()
}
