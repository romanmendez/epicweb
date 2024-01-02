/**
 * @vitest-environment jsdom
 */
import { faker } from '@faker-js/faker'
import { json } from '@remix-run/node'
import { createRemixStub } from '@remix-run/testing'
import { render, screen } from '@testing-library/react'
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react'
import { test } from 'vitest'
import {
	default as UsernameRoute,
	type loader as usernameLoader,
} from './$username.tsx'
import { default as RootRoute, type loader as rootLoader } from '#app/root.tsx'
import { consoleError } from '#tests/setup/setup-test-env.ts'

function createFakeUser() {
	const user = {
		id: faker.string.uuid(),
		name: faker.person.fullName(),
		username: faker.internet.userName(),
		image: {
			id: faker.string.uuid(),
		},
		createdAt: faker.date.past(),
	}
	return user
}

test('The user profile when not logged in as self', async () => {
	const user = createFakeUser()
	const App = createRemixStub([
		{
			path: '/users/:username',
			Component: UsernameRoute,
			loader(): Awaited<ReturnType<typeof usernameLoader>> {
				return json({
					user,
					userJoinedDisplay: user.createdAt.toLocaleDateString(),
				})
			},
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
	const user = createFakeUser()
	const App = createRemixStub([
		{
			id: 'root',
			path: '/',
			loader(): Awaited<ReturnType<typeof rootLoader>> {
				return json({
					username: 'Román',
					user: {
						...user,
						roles: [],
					},
					theme: 'light',
					toast: null,
					ENV: { MODE: 'development', HONEYPOT_SECRET: 'test' },
					csrfToken: 'test-csrf-token',
					honeyProps: {
						nameFieldName: 'name__confirm',
						validFromFieldName: null,
						encryptedValidFrom: 'test',
					},
				})
			},
			children: [
				{
					path: '/users/:username',
					Component: UsernameRoute,
					loader(): Awaited<ReturnType<typeof usernameLoader>> {
						return json({
							user,
							userJoinedDisplay: user.createdAt.toLocaleDateString(),
						})
					},
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
