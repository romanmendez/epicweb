import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'

const prisma = new PrismaClient()

const user = await prisma.user.create({
	data: {
		username: 'romanemendez',
		name: 'Roman',
		email: 'mendezbeck@gmail.com',
	},
})

const note = await prisma.note.create({
	data: {
		title: 'First Name',
		content: 'Some content for the first note',
		ownerId: user.id,
	},
})

await prisma.note.update({
	where: { id: note.id },
	data: {
		images: {
			create: [
				{
					altText: 'an adorable koala cartoon illustration',
					contentType: 'image/png',
					blob: await fs.promises.readFile(
						'./tests/fixtures/images/cute-koala.png',
					),
				},
				{
					altText: 'a cartoon illustration of a koala in a tree eating',
					contentType: 'image/png',
					blob: await fs.promises.readFile(
						'./tests/fixtures/images/koala-eating.png',
					),
				},
			],
		},
	},
})
