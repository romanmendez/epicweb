import { http } from 'msw'
import { server } from '#tests/mocks/index.ts'
import { afterEach, expect, test } from 'vitest'
import { loader } from './auth.$provider.callback.ts'
import { faker } from '@faker-js/faker'
import { connectionSessionStorage } from '#app/utils/connections.server.ts'
import { consoleError } from '#tests/setup/setup-test-env.ts'
import { deleteGitHubUsers, insertGitHubUser } from '#tests/mocks/github.ts'
import { convertSetCookieToCookie, insertNewUser } from '#tests/db-utils.ts'
import { prisma } from '#app/utils/db.server.ts'
import { sessionStorage } from '#app/utils/session.server.ts'
import {
	getSessionExpirationDate,
	sessionIdKey,
} from '#app/utils/auth.server.ts'
import { GITHUB_PROVIDER_NAME } from '#app/utils/connections.tsx'
import { createUser } from '#prisma/seed.ts'

const ROUTE_PATH = '/auth/github/callback'
const PARAMS = { provider: 'github' }
const BASE_URL = 'https://www.epicstack.dev'

afterEach(async () => {
	await deleteGitHubUsers()
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

	expect(response).toHaveRedirect('/login')
	expect(response).toSendToast(
		expect.objectContaining({
			type: 'error',
			title: 'Auth Error',
		}),
	)
	expect(consoleError).toHaveBeenCalledTimes(1)
	consoleError.mockClear()
})

test('existing connection for current user error', async () => {
	const session = await setupUser()
	const githubUser = await insertGitHubUser()
	await prisma.connection.create({
		select: { id: true },
		data: {
			providerName: GITHUB_PROVIDER_NAME,
			providerId: githubUser.profile.id,
			userId: session.userId,
		},
	})
	const request = await setupRequest({
		sessionId: session.id,
		code: githubUser.code,
	})
	const response = await loader({ request, params: PARAMS, context: {} })

	expect(response).toHaveRedirect('/settings/profile/connections')
	expect(response).toSendToast(
		expect.objectContaining({
			type: 'message',
			description: expect.stringContaining(githubUser.profile.login),
			title: 'Already Connected',
		}),
	)
})

test('a new user onboarding', async () => {
	const request = await setupRequest()
	const response = await loader({ request, params: PARAMS, context: {} })

	expect(response).toHaveRedirect('/onboarding/github')
	expect(response).toHaveCookie('en_verification')
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
	expect(response).toSendToast(
		expect.objectContaining({
			type: 'success',
			title: 'Connected',
			description: expect.stringContaining('GitHub'),
		}),
	)
	expect(response).toHaveSessionForUser(user.id)
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
	expect(response).toSendToast(
		expect.objectContaining({
			title: 'Connected',
			type: 'success',
			description: expect.stringContaining('GitHub'),
		}),
	)
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
	expect(response).toHaveSessionForUser(user.id)
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

async function setupUser(userData = createUser()) {
	const user = await insertNewUser(userData)
	const session = await prisma.session.create({
		select: { id: true, userId: true },
		data: {
			userId: user.id,
			expirationDate: getSessionExpirationDate(),
		},
	})
	return session
}
