import { createCookieSessionStorage } from '@remix-run/node' // or cloudflare/deno

export const toastSessionStorage = createCookieSessionStorage({
	// a Cookie from `createCookie` or the same CookieOptions to create one
	cookie: {
		name: 'en_toast',
		secrets: process.env.SESSION_SECRET.split(','),
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
	},
})
