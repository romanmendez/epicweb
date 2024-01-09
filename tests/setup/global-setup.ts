import path from 'node:path'
import fsExtra from 'fs-extra'
import { execaCommand } from 'execa'

export const BASE_DATABASE_URL = path.join(
	process.cwd(),
	'./tests/prisma/data.db',
)

export async function setup() {
	const databaseExists = await fsExtra.pathExists(BASE_DATABASE_URL)
	if (databaseExists) return

	await execaCommand(
		'prisma migrate reset --force --skip-seed --skip-generate',
		{
			stdio: 'inherit',
			env: { ...process.env, DATABASE_URL: `file:${BASE_DATABASE_URL}` },
		},
	)
}
