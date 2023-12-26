import { faker } from '@faker-js/faker'
import { invariant } from '#app/utils/misc.tsx'
import { expect, test } from '#tests/playwright-utils.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
	getSessionExpirationDate,
	sessionIdKey,
} from '#app/utils/auth.server.ts'
import { sessionStorage } from '#app/utils/session.server.ts'
import * as setCookieParser from 'set-cookie-parser'

test('Users can add 2FA to their account and use it when logging in', async ({
	page,
	insertNewUser,
}) => {
	const password = faker.internet.password()
	const user = await insertNewUser({ password })
	invariant(user.name, 'User name is not defined')

	const session = await prisma.session.create({
		select: { id: true, expirationDate: true, userId: true },
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		},
	})
	const cookieSession = await sessionStorage.getSession()
	cookieSession.set(sessionIdKey, session.id)
	const setCookie = await sessionStorage.commitSession(cookieSession)
	const cookieConfig = setCookieParser.parseString(setCookie) as any

	await page.context().addCookies([{ ...cookieConfig, domain: 'localhost' }])

	await page.goto('/settings/profile')

	await page.getByRole('link', { name: /enable 2fa/i }).click()

	await expect(page).toHaveURL(`/settings/profile/two-factor`)
	const main = page.getByRole('main')
	await main.getByRole('button', { name: /enable 2fa/i }).click()
})
