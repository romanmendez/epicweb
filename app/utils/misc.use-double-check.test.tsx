/**
 * @vitest-environment jsdom
 */
import { renderHook, act, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { useDoubleCheck } from './misc.tsx'
import { userEvent } from '@testing-library/user-event'
import { useState } from 'react'

test('hook: prevents default on the first click, and does not on the second', async () => {
	const { result } = renderHook(() => useDoubleCheck())

	expect(result.current.doubleCheck).toBe(false)
	const myClick = vi.fn()
	const click1 = new MouseEvent('click', {
		cancelable: true,
		bubbles: true,
	}) as unknown as React.MouseEvent<HTMLButtonElement>
	act(() => result.current.getButtonProps({ onClick: myClick }).onClick(click1))
	expect(myClick).toHaveBeenCalledWith(click1)
	expect(myClick).toHaveBeenCalledTimes(1)
	expect(click1.defaultPrevented).toBe(true)
	myClick.mockClear()

	const click2 = new MouseEvent('click', {
		cancelable: true,
		bubbles: true,
	}) as unknown as React.MouseEvent<HTMLButtonElement>
	act(() => result.current.getButtonProps({ onClick: myClick }).onClick(click2))
	expect(myClick).toHaveBeenCalledWith(click2)
	expect(myClick).toHaveBeenCalledTimes(1)
	expect(click2.defaultPrevented).toBe(false)
})

function TestComponent() {
	const [preventDefault, setPreventDefault] = useState<'idle' | 'no' | 'yes'>(
		'idle',
	)
	const dc = useDoubleCheck()

	return (
		<div>
			<output>Prevented Default: {preventDefault}</output>
			<button
				{...dc.getButtonProps({
					onClick: e => setPreventDefault(e.defaultPrevented ? 'yes' : 'no'),
				})}
			>
				{dc.doubleCheck ? 'Two' : 'One'}
			</button>
		</div>
	)
}

test('test component: prevents default on the fist click, and does not on the second', async () => {
	const user = userEvent.setup()
	render(<TestComponent />)

	const button = screen.getByRole('button')
	const status = screen.getByRole('status')

	expect(button).toHaveTextContent('One')
	expect(status).toHaveTextContent('Prevented Default: idle')

	await user.click(button)
	expect(button).toHaveTextContent('Two')
	expect(status).toHaveTextContent('Prevented Default: yes')

	await user.click(button)
	expect(button).toHaveTextContent('Two')
	expect(status).toHaveTextContent('Prevented Default: no')
})
