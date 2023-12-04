import { type Password, type User } from '@prisma/client'
import { redirect } from '@remix-run/node'
import bcrypt from 'bcryptjs'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { prisma } from '#app/utils/db.server.ts'
import { combineResponseInits } from './misc.tsx'
import { sessionStorage } from './session.server.ts'

const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30
export const getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME)

export const userIdKey = 'userId'

export function getRedirectRoute(request: Request) {
	const url = new URL(request.url)
	return url.searchParams.get('redirectTo')
}

export async function getUserId(request: Request) {
	const cookieSession = await sessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const userId = cookieSession.get(userIdKey)
	if (!userId) return null
	const user = await prisma.user.findUnique({
		select: { id: true },
		where: { id: userId },
	})
	if (!user) {
		throw await logout({ request })
	}
	return user.id
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
	return verifyUserPassword({ username }, password)
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

	const user = await prisma.user.create({
		select: { id: true },
		data: {
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
	})

	return user
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
