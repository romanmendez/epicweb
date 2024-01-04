import { http } from 'msw'
import * as setCookieParser from 'set-cookie-parser'
import { server } from '#tests/mocks/index.ts'
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { loader } from './auth.$provider.callback.ts'
import { faker } from '@faker-js/faker'
import { connectionSessionStorage } from '#app/utils/connections.server.ts'
import { consoleError } from '#tests/setup/setup-test-env.ts'
import { invariant } from '#app/utils/misc.tsx'
import { deleteGitHubUsers, insertGitHubUser } from '#tests/mocks/github.ts'
import {
	convertSetCookieToCookie,
	insertNewUser,
	insertedUsers,
} from '#tests/db-utils.ts'
import { prisma } from '#app/utils/db.server.ts'
import { sessionStorage } from '#app/utils/session.server.ts'
import {
	getSessionExpirationDate,
	sessionIdKey,
} from '#app/utils/auth.server.ts'

const ROUTE_PATH = '/auth/github/callback'
const PARAMS = { provider: 'github' }
const BASE_URL = 'https://www.epicstack.dev'

beforeAll(() => server.listen())
afterEach(async () => {
	server.resetHandlers()
	await deleteGitHubUsers()
	await prisma.user.deleteMany({
		where: { id: { in: [...insertedUsers] } },
	})
	insertedUsers.clear()
})
afterAll(async () => {
	server.close()
})

test('github auth failure', async () => {
	consoleError.mockImplementation(() => {})
	server.use(
		http.post('https://github.com/login/oauth/access_token', () => {
			return new Response('error', { status: 400 })
		}),
	)
	const request = await setupRequest()
	const response = await loader({ request, params: PARAMS, context: {} }).catch(
		e => e,
	)

	expect(response.headers.get('location')).toBe('/login')
	assertCookieSet(response, 'en_toast')
	expect(consoleError).toHaveBeenCalledTimes(1)
	consoleError.mockClear()
})

test('existing connection for current user error', async () => {
	const githubUser = await insertGitHubUser()
	const user = await insertNewUser({
		email: githubUser.primaryEmail.toLowerCase(),
	})
	await prisma.connection.create({
		select: { id: true },
		data: {
			providerName: 'github',
			providerId: githubUser.profile.id,
			user: { connect: user },
		},
	})
	const session = await prisma.session.create({
		select: { id: true },
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		},
	})
	const request = await setupRequest({ sessionId: session.id })
	const response = await loader({ request, params: PARAMS, context: {} })

	expect(response.headers.get('location')).toBe('/settings/profile/connections')
	assertCookieSet(response, 'en_toast')
})

test('a new user onboarding', async () => {
	const request = await setupRequest()
	const response = await loader({ request, params: PARAMS, context: {} })

	assertRedirect(response, '/onboarding/github')
	assertCookieSet(response, 'en_verification')
})

test('login with new connection for existing user', async () => {
	const githubUser = await insertGitHubUser()
	const user = await insertNewUser({
		email: githubUser.primaryEmail.toLowerCase(),
	})
	const request = await setupRequest({ code: githubUser.code })
	const response = await loader({ request, params: PARAMS, context: {} })
	const connection = await prisma.connection.findFirst({
		where: {
			userId: user.id,
			providerId: githubUser.profile.id,
		},
	})

	expect(response.headers.get('location')).toBe('/settings/profile/connections')
	expect(connection, 'connection was not found').toBeTruthy()
	assertCookieSet(response, 'en_toast')
	assertSessionMade(response, user.id)
})

test('login with existing connection', async () => {
	const githubUser = await insertGitHubUser()
	const user = await insertNewUser({
		email: githubUser.primaryEmail.toLowerCase(),
	})
	const request = await setupRequest({ code: githubUser.code })
	await prisma.connection.create({
		data: {
			providerName: 'github',
			providerId: githubUser.profile.id,
			user: { connect: user },
		},
	})
	const response = await loader({ request, params: PARAMS, context: {} })

	expect(response.headers.get('location')).toBe('/')
	assertSessionMade(response, user.id)
})

test('create new connection for logged in user', async () => {
	const githubUser = await insertGitHubUser()
	const user = await insertNewUser({
		email: githubUser.primaryEmail.toLowerCase(),
	})
	const session = await prisma.session.create({
		select: { id: true },
		data: {
			expirationDate: getSessionExpirationDate(),
			user: { connect: user },
		},
	})
	const request = await setupRequest({
		sessionId: session.id,
		code: githubUser.code,
	})
	const response = await loader({ request, params: PARAMS, context: {} })
	const connection = await prisma.connection.findFirst({
		where: {
			userId: user.id,
			providerId: githubUser.profile.id,
		},
	})

	expect(response.headers.get('location')).toBe('/settings/profile/connections')
	expect(connection).toBeTruthy()
	assertCookieSet(response, 'en_toast')
})

async function setupRequest({
	sessionId,
	code = faker.string.uuid(),
}: { sessionId?: string; code?: string } = {}) {
	const url = new URL(ROUTE_PATH, BASE_URL)
	const state = faker.string.uuid()
	url.searchParams.set('code', code)
	url.searchParams.set('state', state)

	const connectionSession = await connectionSessionStorage.getSession()
	connectionSession.set('oauth2:state', state)
	const setCookie =
		await connectionSessionStorage.commitSession(connectionSession)

	const cookieSession = await sessionStorage.getSession()
	if (sessionId) cookieSession.set(sessionIdKey, sessionId)
	const setSessionCookie = await sessionStorage.commitSession(cookieSession)

	return new Request(url.toString(), {
		method: 'GET',
		headers: {
			cookie: [
				convertSetCookieToCookie(setCookie),
				convertSetCookieToCookie(setSessionCookie),
			].join(';'),
		},
	})
}

function assertCookieSet(response: Response, cookieKey: string) {
	const setCookie = response.headers.get('set-cookie')
	invariant(setCookie, 'set-cookie should be set')
	const parsedCookie = setCookieParser.splitCookiesString([setCookie])
	expect(parsedCookie).toEqual(
		expect.arrayContaining([expect.stringContaining(cookieKey)]),
	)
}

async function assertSessionMade(response: Response, userId: string) {
	assertCookieSet(response, 'en_session')
	const session = await prisma.session.findFirst({
		select: { id: true },
		where: {
			userId,
		},
	})
	expect(session).toBeTruthy()
}

function assertRedirect(response: Response, redirectTo: string) {
	expect(response.status).toBeGreaterThanOrEqual(300)
	expect(response.status).toBeLessThan(400)
	expect(response.headers.get('location')).toBe(redirectTo)
}
