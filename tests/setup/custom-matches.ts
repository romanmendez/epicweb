import * as setCookieParser from 'set-cookie-parser'
import { expect } from 'vitest'
import { sessionIdKey } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { sessionStorage } from '#app/utils/session.server.ts'
import {
	type OptionalToast,
	toastKey,
	toastSessionStorage,
} from '#app/utils/toast.server.ts'
import { convertSetCookieToCookie } from '#tests/db-utils.ts'

expect.extend({
	toHaveRedirect(response: Response, redirectTo?: string) {
		const location = response.headers.get('location')
		const redirectToIsSupplied = redirectTo !== undefined
		if (redirectToIsSupplied !== Boolean(location)) {
			return {
				pass: Boolean(location),
				message: () =>
					`Expected response to ${this.isNot ? 'not ' : ''}redirect${
						redirectToIsSupplied
							? ` to ${this.utils.printExpected(redirectTo)}`
							: ''
					}, but got ${
						location ? this.utils.printReceived(location) : 'no redirect'
					}`,
			}
		}
		const isRedirectStatusCode = response.status >= 300 && response.status < 400
		if (!isRedirectStatusCode) {
			return {
				pass: false,
				message: () =>
					`Expected response to ${
						this.isNot ? 'not ' : ''
					}have a redirect status code ${this.utils.printExpected(
						'>= 300 && < 400',
					)}but got ${this.utils.printReceived(response.status)}`,
			}
		}
		function toUrl(s?: string | null) {
			s ??= ''
			return s.startsWith('http')
				? new URL(s)
				: new URL(s, 'https://www.test.com')
		}
		function urlsMatch(u1: URL, u2: URL) {
			const u1SP = new URL(u1).searchParams
			u1SP.sort()
			const u2SP = new URL(u2).searchParams
			u2SP.sort()
			return (
				u1.origin === u2.origin &&
				u1.pathname === u2.pathname &&
				u1SP.toString() === u2SP.toString() &&
				u1.hash === u2.hash
			)
		}
		return {
			pass:
				location === redirectTo ||
				urlsMatch(toUrl(location), toUrl(redirectTo)),
			message: () =>
				`Expected response to ${
					this.isNot ? 'not ' : ''
				}have redirect to ${this.utils.printExpected(
					redirectTo,
				)} but got ${this.utils.printReceived(location)}`,
		}
	},
	async toHaveSessionForUser(response: Response, userId: string) {
		const setCookie = getSetCookie(response.headers)
		const sessionSetCookie = setCookie.find(
			cookie => setCookieParser.parseString(cookie).name === 'en_session',
		)
		if (!sessionSetCookie) {
			return {
				pass: false,
				message: () =>
					`The 'en_session' set-cookie header was ${
						this.isNot ? '' : 'not '
					} defined.`,
			}
		}
		const sessionCookie = await sessionStorage.getSession(
			convertSetCookieToCookie(sessionSetCookie),
		)
		const sessionValue = sessionCookie.get(sessionIdKey)
		if (!sessionValue) {
			return {
				pass: false,
				message: () =>
					`A session was ${this.isNot ? '' : 'not '} set in cookie.`,
			}
		}
		const session = await prisma.session.findUnique({
			select: { id: true },
			where: { userId, id: sessionValue },
		})
		return {
			pass: Boolean(session),
			message: () =>
				`A session was ${
					this.isNot ? '' : 'not '
				} created in the database for user ID ${userId}`,
		}
	},
	async toSendToast(response: Response, toast: OptionalToast) {
		const setCookies = getSetCookie(response.headers)
		const toastSetCookie = setCookies.find(
			c => setCookieParser.parseString(c).name === 'en_toast',
		)

		if (!toastSetCookie) {
			return {
				pass: false,
				message: () =>
					`en_toast set-cookie header was ${this.isNot ? '' : 'not '} defined.`,
			}
		}

		const cookieSession = await toastSessionStorage.getSession(
			convertSetCookieToCookie(toastSetCookie),
		)
		const toastValue = cookieSession.get(toastKey)
		if (!toastValue) {
			return {
				pass: false,
				message: () => `toast was ${this.isNot ? '' : 'not '} set in session.`,
			}
		}

		const pass = this.equals(toastValue, toast)
		const diff = pass ? null : `\n${this.utils.diff(toast, toastValue)}`

		return {
			pass,
			message: () =>
				`toast in response ${
					this.isNot ? 'does not match' : 'matches'
				} the expected toast${diff}`,
		}
	},
	toHaveCookie(response: Response, cookieKey: string) {
		const setCookie = getSetCookie(response.headers)
		const cookieObjs = setCookie.map(cookie =>
			setCookieParser.parseString(cookie),
		)
		return {
			pass: cookieObjs.some(cookie => cookie.name === cookieKey),
			message: () => {
				return `Expected ${
					this.isNot ? 'not ' : ''
				}to have ${this.utils.printExpected(
					cookieKey,
				)} cookie but got ${cookieObjs
					.map(cookie =>
						cookie.name !== 'redirectTo'
							? this.utils.printReceived(cookie.name)
							: false,
					)
					.filter(Boolean)}`
			},
		}
	},
})

interface CustomMatchers<R = unknown> {
	toHaveRedirect(redirectTo: string): R
	toHaveCookie(cookie: string): R
	toHaveSessionForUser(userId: string): R
	toSendToast(toast: OptionalToast): R
}
declare module 'vitest' {
	interface Assertion<T = any> extends CustomMatchers<T> {}
	interface AsymmetricMatchersContaining extends CustomMatchers {}
}
function getSetCookie(headers: Headers) {
	// this is a sort of polyfill for headers.getSetCookie
	// https://github.com/microsoft/TypeScript/issues/55270
	// https://github.com/remix-run/remix/issues/7067
	// @ts-expect-error see the two issues above
	return headers.getAll('set-cookie') as Array<string>
}
