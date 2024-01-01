/**
 * @vitest-environment jsdom
 */
import { json } from '@remix-run/node'
import { createRemixStub } from '@remix-run/testing'
import { render, screen } from '@testing-library/react'
import { test } from 'vitest'
import { default as Greeting, type loader } from './$username.tsx'

test('The user profile when not logged in as self', async () => {
	const App = createRemixStub([
		{
			path: '/',
			Component: Greeting,
			loader(): Awaited<ReturnType<typeof loader>> {
				return json({
					greeting: 'Hello, world!',
				})
			},
		},
	])

	render(<App />)

	const greeting = await screen.findByRole('status')
	console.log(greeting)
})
