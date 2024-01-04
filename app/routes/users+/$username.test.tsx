/**
 * @vitest-environment jsdom
 */
import { faker } from '@faker-js/faker'
import { createRemixStub } from '@remix-run/testing'
import { render, screen } from '@testing-library/react'
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react'
import { test } from 'vitest'
import {
	default as UsernameRoute,
	loader as usernameLoader,
} from './$username.tsx'
import { loader as rootLoader } from '#app/root.tsx'
import { prisma } from '#app/utils/db.server.ts'
import {
	getSessionExpirationDate,
	sessionIdKey,
} from '#app/utils/auth.server.ts'
import { type User } from '@prisma/client'
import { sessionStorage } from '#app/utils/session.server.ts'
import { convertSetCookieToCookie, insertNewUser } from '#tests/db-utils.ts'
import { getUserImages } from '#prisma/seed.ts'

test('The user profile when not logged in as self', async () => {
	const user = await insertNewUser()
	const userImages = await getUserImages()
	await prisma.user.update({
		where: { id: user.id },
		data: {
			image: {
				create:
					userImages[faker.number.int({ min: 0, max: userImages.length - 1 })],
			},
		},
	})

	const App = createRemixStub([
		{
			path: '/users/:username',
			Component: UsernameRoute,
			loader: usernameLoader,
		},
	])

	const routeUrl = `/users/${user.username}`
	render(<App initialEntries={[routeUrl]} />, {
		wrapper: ({ children }) => (
			<AuthenticityTokenProvider token="test-csrf-token">
				{children}
			</AuthenticityTokenProvider>
		),
	})

	await screen.findByRole('heading', { level: 1, name: user.name })
	await screen.findByRole('img', { name: user.name })
	await screen.findByRole('link', { name: `${user.name}'s notes` })
})

test('The user profile when logged in as self', async () => {
	const user = await insertNewUser()
	const request = await setupRequest(user)
	const App = createRemixStub([
		{
			id: 'root',
			path: '/',
			loader: args => {
				args.request = request
				return rootLoader(args)
			},
			children: [
				{
					path: '/users/:username',
					Component: UsernameRoute,
					loader: usernameLoader,
				},
			],
		},
	])

	const routeUrl = `/users/${user.username}`
	render(<App initialEntries={[routeUrl]} />, {
		wrapper: ({ children }) => (
			<AuthenticityTokenProvider token="test-csrf-token">
				{children}
			</AuthenticityTokenProvider>
		),
	})

	await screen.findByRole('heading', { level: 1, name: user.name })
	await screen.findByRole('img', { name: user.name })
	await screen.findByRole('button', { name: /logout/i })
	await screen.findByRole('link', { name: /my notes/i })
	await screen.findByRole('link', { name: /edit profile/i })
})

async function setupRequest(user: User) {
	const url = new URL(`/users/${user.username}`, 'http://www.test.com')
	const session = await prisma.session.create({
		select: { id: true },
		data: {
			expirationDate: getSessionExpirationDate(),
			user: { connect: user },
		},
	})
	const cookieSession = await sessionStorage.getSession()
	cookieSession.set(sessionIdKey, session.id)
	const setCookie = await sessionStorage.commitSession(cookieSession)

	return new Request(url.toString(), {
		method: 'GET',
		headers: {
			cookie: convertSetCookieToCookie(setCookie),
		},
	})
}
