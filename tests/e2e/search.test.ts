import { prisma } from '#app/utils/db.server.ts'
import { createUser } from '#tests/db-utils.ts'
import { test as base } from '@playwright/test'

const test = base.extend<{
	inserNewUser(): Promise<{
		id: string
		username: string
		name: string | null
	}>
}>({
	inserNewUser: async ({}, use) => {
		let userId: string | undefined = undefined
		await use(async () => {
			const userData = createUser()
			const newUser = await prisma.user.create({
				select: { id: true, username: true, name: true },
				data: userData,
			})
			userId = newUser.id
			return newUser
		})
		await prisma.user.deleteMany({
			where: { id: userId },
		})
	},
})
const { expect } = test

test('search for user', async ({ page, inserNewUser }) => {
	const { username, name } = await inserNewUser()
	await page.goto('/')
	await page.getByRole('searchbox', { name: /search/i }).fill(username)
	await page.getByRole('button', { name: 'search' }).click()

	await page.waitForURL(`/users?${new URLSearchParams({ search: username })}`)
	await expect(
		page.getByRole('heading', { name: 'Epic Notes Users' }),
	).toBeVisible()
	const userList = page.getByRole('main').getByRole('list')
	await expect(userList.getByRole('listitem')).toHaveCount(1)
	await expect(userList.getByAltText(name || '')).toBeVisible()

	const randomString = '__nonexistinguser__'
	await page.getByRole('searchbox', { name: /search/i }).fill(randomString)
	await page.getByRole('button', { name: 'search' }).click()
	await page.waitForURL(`/users?search=${randomString}`)
	await expect(userList.getByRole('listitem')).toHaveCount(0)
	await expect(page.getByText(/no users found/i)).toBeVisible()
})
