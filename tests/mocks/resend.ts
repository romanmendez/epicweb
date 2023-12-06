import { http, HttpResponse, type HttpHandler } from 'msw'
import { faker } from '@faker-js/faker'
import { z } from 'zod'

const EmailSchema = z.object({
	from: z.string(),
	to: z.string(),
	subject: z.string(),
	html: z.string(),
	text: z.string(),
})

export const handlers: Array<HttpHandler> = [
	http.post('https://api.resend.com/emails', async ({ request }) => {
		const body = EmailSchema.parse(await request.json())
		console.log('🔶 mocked email contents', body)

		return HttpResponse.json({
			id: faker.string.uuid(),
			from: body.from,
			to: body.to,
			created_at: new Date().toISOString(),
		})
	}),
]
