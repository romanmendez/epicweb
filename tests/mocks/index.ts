import closeWithGrace from 'close-with-grace'
import { passthrough, http } from 'msw'
import { setupServer } from 'msw/node'
import { handlers as resendHandlers } from './resend.ts'
import { handlers as githubHandlers } from './github.ts'

const miscHandlers = [
	process.env.REMIX_DEV_ORIGIN
		? http.post(`${process.env.REMIX_DEV_ORIGIN}ping`, passthrough)
		: null,
].filter(Boolean)

export const server = setupServer(
	...miscHandlers,
	...resendHandlers,
	...githubHandlers,
)

console.info('🔶 Mock server installed')
server.listen({ onUnhandledRequest: 'warn' })

closeWithGrace(() => {
	server.close()
})
