import { createCookieSessionStorage } from '@remix-run/node'

export const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'en_session',
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		secrets: process.env.SESSION_SECRET.split(','),
		secure: process.env.NODE_ENV === 'production',
	},
})

const originalCommitSesion = sessionStorage.commitSession
Object.defineProperty(sessionStorage, 'commitSession', {
	value: async (...args: Parameters<typeof originalCommitSesion>) => {
		const [session, opt] = args
		if (opt?.expires) {
			session.set('expires', opt.expires)
		}
		if (opt?.maxAge) {
			const expires = new Date(Date.now() + opt.maxAge)
			session.set('expires', expires)
		}
		const expires = session.has('expires')
			? new Date(session.get('expires'))
			: undefined
		const setCookieHeader = await originalCommitSesion(session, {
			...opt,
			expires,
		})
		return setCookieHeader
	},
})
