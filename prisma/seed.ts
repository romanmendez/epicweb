import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'

const prisma = new PrismaClient()

// because of our cascading effect in our schema, deleting the users will delete notes and images as well
await prisma.user.deleteMany()
await prisma.user.create({
	data: {
		username: 'romanemendez',
		name: 'Roman',
		email: 'mendezbeck@gmail.com',
		id: 'd5t667', // providing our own ID will allow us to re-seed while always working on the same note
		notes: {
			create: {
				title: 'Basic Koala Facts',
				content:
					'Koalas are found in the eucalyptus forests of eastern Australia. They have grey fur with a cream-coloured chest, and strong, clawed feet, perfect for living in the branches of trees!',
				// nesting seed creating
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
		},
	},
})
