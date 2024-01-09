import 'dotenv/config'
import './db-setup.ts'
import '#app/utils/env.server.ts'
import '@testing-library/jest-dom/vitest'
import './custom-matches.ts'
import { installGlobals } from '@remix-run/node'
import { type SpyInstance, beforeEach, vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from '#tests/mocks/index.ts'

installGlobals()

afterEach(() => server.resetHandlers())
afterEach(() => cleanup())

export let consoleError: SpyInstance<Parameters<typeof console.error>>

beforeEach(async () => {
	const originalConsoleError = console.error

	consoleError = vi.spyOn(console, 'error')

	consoleError.mockImplementation(
		(...args: Parameters<typeof console.error>) => {
			originalConsoleError(args)
			throw new Error(
				'console.error was called. If that is expected then use consoleError.mockImplementation(() => {})',
			)
		},
	)
})

afterEach(() => cleanup())
