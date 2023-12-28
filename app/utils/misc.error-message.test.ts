import { test, expect } from 'vitest'
import { getErrorMessage } from './misc.tsx'
import { faker } from '@faker-js/faker'
import { consoleError } from '#tests/setup/setup-test-env.ts'

test('Error object returns message string', () => {
	const message = faker.lorem.words(2)
	const error = new Error(message)
	expect(getErrorMessage(error)).toBe(message)
})
test('String returns itself', () => {
	const message = faker.lorem.words(2)
	expect(getErrorMessage(message)).toBe(message)
})
test('Undefined fallback to unknown', () => {
	consoleError.mockImplementation(() => {})
	expect(getErrorMessage(undefined)).toBe('Unknown Error')
	expect(consoleError).toHaveBeenCalledTimes(1)
	expect(consoleError).toHaveBeenCalledWith(
		'Unable to get error message for error',
		undefined,
	)
})
