import 'dotenv/config'
import '#app/utils/env.server.ts'

import { installGlobals } from '@remix-run/node'
import { type SpyInstance, beforeEach, vi } from 'vitest'

installGlobals()

export let consoleError: SpyInstance<Parameters<typeof console.error>>
export let consoleLog: SpyInstance<Parameters<typeof console.log>>

beforeEach(async () => {
	const originalConsoleError = console.error
	const originalConsoleLog = console.log

	consoleError = vi.spyOn(console, 'error')
	consoleLog = vi.spyOn(console, 'log')

	consoleError.mockImplementation(
		(...args: Parameters<typeof console.error>) => {
			originalConsoleError(args)
			throw new Error(
				'console.error was called. If that is expected then use consoleError.mockImplementation(() => {})',
			)
		},
	)
	consoleLog.mockImplementation((...args: Parameters<typeof console.error>) => {
		originalConsoleLog(args)
		throw new Error(
			'console.log was called. If that is expected then use consoleLog.mockImplementation(() => {})',
		)
	})
})
