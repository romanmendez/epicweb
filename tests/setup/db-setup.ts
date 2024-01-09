import path from 'path'
import { afterAll, afterEach, beforeAll } from 'vitest'
import fsExtra from 'fs-extra'
import { BASE_DATABASE_URL } from './global-setup.ts'

const databaseFile = `./tests/prisma/data.${process.env.VITEST_POOL_ID || 0}.db`
const databasePath = path.join(process.cwd(), databaseFile)
process.env.DATABASE_URL = `file:${databasePath}`

beforeAll(async () => {
	await fsExtra.copyFile(BASE_DATABASE_URL, databasePath)
})
afterEach(async () => {
	const { prisma } = await import('#app/utils/db.server.ts')
	prisma.user.deleteMany()
})
afterAll(async () => {
	const { prisma } = await import('#app/utils/db.server.ts')
	prisma.$disconnect()
	await fsExtra.remove(databasePath)
})
