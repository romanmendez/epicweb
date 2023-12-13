import { type Password, type User } from '@prisma/client'
import { redirect } from '@remix-run/node'
import bcrypt from 'bcryptjs'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { prisma } from '#app/utils/db.server.ts'
import { combineResponseInits } from './misc.tsx'
import { sessionStorage } from './session.server.ts'
import { verifySessionStorage } from './verification.server.ts'
import { unverifiedSessionIdKey } from '#app/routes/_auth+/login.tsx'
import { getRedirectToUrl } from '#app/routes/_auth+/verify.tsx'
import { twoFAVerificationType } from '#app/routes/settings+/profile.two-factor.tsx'
import { Authenticator } from 'remix-auth'
import { GitHubStrategy } from 'remix-auth-github'
import { redirectWithToast } from './toast.server.ts'
import { connectionSessionStorage } from './connections.server.ts'

const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30
export const getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME)

export const sessionIdKey = 'sessionId'

type ProviderUser = {
	id: string
	email: string
	username: string
	name?: string
	imageUrl?: string
}

export const authenticator = new Authenticator<ProviderUser>(
	connectionSessionStorage,
)
authenticator.use(
	new GitHubStrategy(
		{
			clientID: process.env.GITHUB_CLIENT_ID,
			clientSecret: process.env.GITHUB_CLIENT_SECRET,
			callbackURL: '/auth/github/callback',
		},
		async ({ profile }) => {
			const email = profile.emails[0].value.trim().toLowerCase()
			if (!email) {
				throw redirectWithToast('/login', {
					title: 'No email found',
					description: 'Please add a verified email to your github account.',
					type: 'error',
				})
			}
			return {
				id: profile.id,
				email,
				username: profile.displayName,
				name: profile.name.givenName,
				imageUrl: profile.photos[0].value,
			}
		},
	),
	'github',
)

export function getRedirectRoute(request: Request) {
	const url = new URL(request.url)
	return url.searchParams.get('redirectTo')
}

export async function getUserId(request: Request) {
	const cookieSession = await sessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = cookieSession.get(sessionIdKey)
	if (!sessionId) return null
	const session = await prisma.session.findUnique({
		select: { user: { select: { id: true } } },
		where: { id: sessionId, expirationDate: { gte: new Date(Date.now()) } },
	})
	if (!session?.user) {
		throw await logout({ request })
	}
	return session.user.id
}

export async function getUserRoles(userId: string) {
	const user = await prisma.user.findUnique({
		select: { roles: true },
		where: { id: userId },
	})
	return user?.roles
}

export async function requireUserId(
	request: Request,
	{ redirectTo }: { redirectTo?: string | null } = {},
) {
	const requestUrl = new URL(request.url)
	redirectTo =
		redirectTo === null
			? null
			: redirectTo ?? `${requestUrl.pathname}${requestUrl.searchParams}`
	const loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null
	const loginRedirect = ['/login', loginParams?.toString()]
		.filter(Boolean)
		.join('?')

	const userId = await getUserId(request)
	if (!userId) {
		throw redirect(loginRedirect)
	}
	return userId
}

export async function requireUser(request: Request) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { username: true, id: true },
	})
	if (!user) {
		await logout({ request })
	}
	return user
}

export async function requireAnonymous(request: Request) {
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const unverifiedSessionId = verifySession.get(unverifiedSessionIdKey)
	if (unverifiedSessionId) {
		const { userId } = await prisma.session.findFirstOrThrow({
			where: { id: unverifiedSessionId },
			select: { userId: true },
		})
		const redirectUrl = getRedirectToUrl({
			request,
			type: twoFAVerificationType,
			target: userId,
		})
		throw redirect(redirectUrl.toString())
	}
	const userId = await getUserId(request)
	if (userId) {
		throw redirect('/')
	}
}

export async function login({
	username,
	password,
}: {
	username: User['username']
	password: string
}) {
	const user = await verifyUserPassword({ username }, password)
	if (!user) return null
	const session = await prisma.session.create({
		select: { id: true, expirationDate: true, userId: true },
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		},
	})
	return session
}

export async function resetUserPassword({
	username,
	password,
}: {
	username: User['username']
	password: string
}) {
	const hashedPassword = await getPasswordHash(password)
	await prisma.user.update({
		select: { id: true },
		where: { username },
		data: {
			password: {
				update: {
					hash: hashedPassword,
				},
			},
		},
	})
}

export async function signup({
	email,
	username,
	password,
	name,
}: {
	email: User['email']
	username: User['username']
	name: User['name']
	password: string
}) {
	const hashedPassword = await getPasswordHash(password)
	const session = await prisma.session.create({
		select: { id: true, expirationDate: true },
		data: {
			expirationDate: getSessionExpirationDate(),
			user: {
				create: {
					email: email.toLowerCase(),
					username: username.toLowerCase(),
					name,
					roles: { connect: { name: 'user' } },
					password: {
						create: {
							hash: hashedPassword,
						},
					},
				},
			},
		},
	})

	return session
}

export async function logout(
	{
		request,
		redirectTo = '/',
	}: {
		request: Request
		redirectTo?: string
	},
	responseInit?: ResponseInit,
) {
	const cookieSession = await sessionStorage.getSession(
		request.headers.get('cookie'),
	)
	void prisma.session
		.delete({
			where: { id: cookieSession.get(sessionIdKey) },
		})
		.catch(() => {})

	throw redirect(
		safeRedirect(redirectTo),
		combineResponseInits(responseInit, {
			headers: {
				'set-cookie': await sessionStorage.destroySession(cookieSession),
			},
		}),
	)
}

export async function getPasswordHash(password: string) {
	const hash = await bcrypt.hash(password, 10)
	return hash
}

export async function verifyUserPassword(
	where: Pick<User, 'username'> | Pick<User, 'id'>,
	password: Password['hash'],
) {
	const userWithPassword = await prisma.user.findUnique({
		where,
		select: { id: true, password: { select: { hash: true } } },
	})

	if (!userWithPassword || !userWithPassword.password) {
		return null
	}

	const isValid = await bcrypt.compare(password, userWithPassword.password.hash)

	if (!isValid) {
		return null
	}

	return { id: userWithPassword.id }
}
