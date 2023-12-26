import { createCookieSessionStorage } from '@remix-run/node'

export const verifySessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'en_verification',
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		secrets: process.env.SESSION_SECRET.split(','),
		secure: process.env.NODE_ENV === 'production',
	},
})

export const unverifiedSessionIdKey = 'unverified-session-id'
export const rememberMeKey = 'remember-me'
export const verifiedTimeKey = 'verified-time'
export const sessionExpirationTime = 1000 * 5 // 5 seconds for testing
