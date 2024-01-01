import { faker } from '@faker-js/faker'
import { invariant } from '#app/utils/misc.tsx'
import { expect, test } from '#tests/playwright-utils.ts'
import { generateTOTP } from '@epic-web/totp'

test('Users can add 2FA to their account and use it when logging in', async ({
	page,
	login,
}) => {
	const password = faker.internet.password()
	const user = await login({ password })
	invariant(user.name, 'User name is not defined')
	await page.goto('/settings/profile')
	await page.getByRole('link', { name: /enable 2fa/i }).click()

	await expect(page).toHaveURL(`/settings/profile/two-factor`)
	const main = page.getByRole('main')
	await main.getByRole('button', { name: /enable 2fa/i }).click()

	await expect(page).toHaveURL(`/settings/profile/two-factor/verify`)
	const otpUriString = await main
		.getByLabel(/one-time password uri/i)
		.innerText()

	const otpUri = new URL(otpUriString)
	const options = Object.fromEntries(otpUri.searchParams)

	await main
		.getByRole('textbox', { name: /code/i })
		.fill(generateTOTP(options).otp)
	await main.getByRole('button', { name: /submit/i }).click()
	await expect(main).toHaveText(/you have enabled two-factor authentication/i)
	await expect(main.getByRole('link', { name: /disable 2fa/i })).toBeVisible()

	await page.getByRole('link', { name: user.name }).click()
	await page.getByRole('button', { name: /logout/i }).click()

	await expect(
		page.getByRole('heading', { level: 1, name: /epic notes/i }),
	).toBeVisible()
	await page.getByRole('link', { name: /log in/i }).click()
	await page.getByRole('textbox', { name: /username/i }).fill(user.username)
	await page.getByRole('textbox', { name: /password/i }).fill(password)
	await page.getByRole('button', { name: /log in/i }).click()

	await page
		.getByRole('textbox', { name: /code/i })
		.fill(generateTOTP(options).otp)
	await page.getByRole('button', { name: /submit/i }).click()

	await expect(page.getByRole('link', { name: user.name })).toBeVisible()
})

test('User can cancel 2FA login flow', async ({ page, login }) => {
	const password = faker.internet.password()
	const user = await login({ password })
	invariant(user.name, 'User name is not defined')
	await page.goto('/settings/profile')
	await page.getByRole('link', { name: /enable 2fa/i }).click()

	await expect(page).toHaveURL(`/settings/profile/two-factor`)
	const main = page.getByRole('main')
	await main.getByRole('button', { name: /enable 2fa/i }).click()

	await expect(page).toHaveURL(`/settings/profile/two-factor/verify`)
	const otpUriString = await main
		.getByLabel(/one-time password uri/i)
		.innerText()

	const otpUri = new URL(otpUriString)
	const options = Object.fromEntries(otpUri.searchParams)

	await main
		.getByRole('textbox', { name: /code/i })
		.fill(generateTOTP(options).otp)
	await main.getByRole('button', { name: /submit/i }).click()
	await expect(main).toHaveText(/you have enabled two-factor authentication/i)
	await expect(main.getByRole('link', { name: /disable 2fa/i })).toBeVisible()

	await page.getByRole('link', { name: user.name }).click()
	await page.getByRole('button', { name: /logout/i }).click()

	await expect(
		page.getByRole('heading', { level: 1, name: /epic notes/i }),
	).toBeVisible()
	await page.getByRole('link', { name: /log in/i }).click()
	await page.getByRole('textbox', { name: /username/i }).fill(user.username)
	await page.getByRole('textbox', { name: /password/i }).fill(password)
	await page.getByRole('button', { name: /log in/i }).click()

	await expect(
		page.getByRole('heading', { level: 1, name: /check your 2fa app/i }),
	).toBeVisible()
	await page.getByRole('button', { name: /cancel/i }).click()

	await expect(page).toHaveURL('/')

	await page.getByRole('link', { name: /log in/i }).click()
	await expect(
		page.getByRole('heading', { name: /welcome back!/i }),
	).toBeVisible()
})
test('User is returned to 2FA verify page after leaving flow', async ({
	page,
	login,
}) => {
	const password = faker.internet.password()
	const user = await login({ password })
	invariant(user.name, 'User name is not defined')
	await page.goto('/settings/profile')
	await page.getByRole('link', { name: /enable 2fa/i }).click()

	await expect(page).toHaveURL(`/settings/profile/two-factor`)
	const main = page.getByRole('main')
	await main.getByRole('button', { name: /enable 2fa/i }).click()

	await expect(page).toHaveURL(`/settings/profile/two-factor/verify`)
	const otpUriString = await main
		.getByLabel(/one-time password uri/i)
		.innerText()

	const otpUri = new URL(otpUriString)
	const options = Object.fromEntries(otpUri.searchParams)

	await main
		.getByRole('textbox', { name: /code/i })
		.fill(generateTOTP(options).otp)
	await main.getByRole('button', { name: /submit/i }).click()
	await expect(main).toHaveText(/you have enabled two-factor authentication/i)
	await expect(main.getByRole('link', { name: /disable 2fa/i })).toBeVisible()

	await page.getByRole('link', { name: user.name }).click()
	await page.getByRole('button', { name: /logout/i }).click()

	await expect(
		page.getByRole('heading', { level: 1, name: /epic notes/i }),
	).toBeVisible()
	const loginButton = page.getByRole('link', { name: /log in/i })
	await loginButton.click()
	await page.getByRole('textbox', { name: /username/i }).fill(user.username)
	await page.getByRole('textbox', { name: /password/i }).fill(password)
	await page.getByRole('button', { name: /log in/i }).click()

	const twoFAHeading = page.getByRole('heading', {
		level: 1,
		name: /check your 2fa app/i,
	})
	await expect(twoFAHeading).toBeVisible()
	await page.getByRole('button', { name: /search/i }).click()
	await expect(
		page.getByRole('heading', { name: /epic notes users/i }),
	).toBeVisible()
	await loginButton.click()
	await expect(twoFAHeading).toBeVisible()
}) //TODO
