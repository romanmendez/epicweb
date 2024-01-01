/**
 * @vitest-environment jsdom
 */

import { expect, test } from 'vitest'
import { screen, render } from '@testing-library/react'
import { ErrorList } from './forms.tsx'
import { faker } from '@faker-js/faker'

test('shows nothing when given an empty list of errors', async () => {
	render(<ErrorList />)
	expect(screen.queryAllByRole('listitem')).toHaveLength(0)
})

test('shows a single error', async () => {
	const errors = [faker.lorem.words(2)]
	render(<ErrorList errors={errors} />)
	const errorEls = screen.getAllByRole('listitem')
	expect(errorEls.map(e => e.textContent)).toEqual(errors)
})

test('shows multiple errors', async () => {
	const errors = [faker.lorem.words(2)]
	render(<ErrorList errors={errors} />)
	const errorEls = screen.getAllByRole('listitem')
	expect(errorEls.map(e => e.textContent)).toEqual(errors)
})

test('can cope with falsy values', async () => {
	const errors = [
		faker.lorem.words(2),
		'',
		faker.lorem.words(2),
		null,
		undefined,
	]
	render(<ErrorList errors={errors} />)
	const errorEls = screen.getAllByRole('listitem')
	const trueErrors = errors.filter(Boolean)
	expect(errorEls).toHaveLength(trueErrors.length)
	expect(errorEls.map(e => e.textContent)).toEqual(trueErrors)
})

test('adds id to the ul', async () => {
	const id = faker.number.hex()
	const error = [faker.lorem.words(2)]
	render(<ErrorList id={id} errors={error} />)
	const ul = screen.getByRole('list')
	expect(ul).toHaveAttribute('id', id)
})
