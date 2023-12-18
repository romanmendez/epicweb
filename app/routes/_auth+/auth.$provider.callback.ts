import {
	authenticator,
	getSessionExpirationDate,
	getUserId,
} from '#app/utils/auth.server.ts'
import { ProviderNameSchema, providerLabels } from '#app/utils/connections.tsx'
import { prisma } from '#app/utils/db.server.ts'
import {
	createToastHeaders,
	redirectWithToast,
} from '#app/utils/toast.server.ts'
import { redirect, type DataFunctionArgs } from '@remix-run/node'
import { handleNewSession } from './login.tsx'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { onboardingEmailSessionKey } from './onboarding.tsx'
import { providerIdKey, providerProfileKey } from './onboarding_.$provider.tsx'

export async function loader({ request, params }: DataFunctionArgs) {
	const providerName = ProviderNameSchema.parse(params.provider)

	const label = providerLabels[providerName]

	const profile = await authenticator
		.authenticate('github', request, {
			throwOnError: true,
		})
		.catch(async error => {
			console.error(error)
			throw await redirectWithToast('/', {
				type: 'error',
				title: `Auth Error`,
				description: `There was an error authenticating with ${label}`,
			})
		})
	const existingConnection = await prisma.connection.findUnique({
		where: {
			providerId_providerName: {
				providerName,
				providerId: profile.id,
			},
		},
		select: { userId: true },
	})
	const user = await prisma.user.findUnique({
		where: { email: profile.email },
		select: { id: true },
	})
	const userId = await getUserId(request)

	if (existingConnection && userId) {
		throw await redirectWithToast('/settings/profile/connections', {
			type: 'error',
			title: 'Auth Error',
			description:
				existingConnection.userId === userId
					? `You have already connected this account.`
					: `This ${label} account has already been connected to another Epic Notes account.`,
		})
	}
	if (existingConnection) {
		return makeSession({
			request,
			userId: existingConnection.userId,
		})
	}
	if (userId) {
		await prisma.connection.create({
			data: { providerName, providerId: profile.id, userId },
		})
		return await redirectWithToast('/settings/profile/connections', {
			type: 'success',
			title: 'Connected',
			description: `Your ${label} account has been connected to your Epic Notes account.`,
		})
	}
	if (user) {
		await prisma.connection.create({
			data: { providerName, providerId: profile.id, userId: user.id },
		})
		return await makeSession(
			{
				request,
				userId: user.id,
				redirectTo: '/settings/profile/connections',
			},
			{
				headers: await createToastHeaders({
					type: 'success',
					title: 'Connected',
					description: `Your ${label} account has been connected to your Epic Notes account.`,
				}),
			},
		)
	}
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	verifySession.set(onboardingEmailSessionKey, profile.email)
	verifySession.set(providerIdKey, profile.id)
	verifySession.set(providerProfileKey, {
		...profile,
		username: profile.username
			?.replace(/[^a-zA-Z0-9]/gi, '_')
			.toLowerCase()
			.slice(0, 20)
			.padEnd(3, '_'),
	})
	return redirect(`/onboarding/${providerName}`, {
		headers: {
			'set-cookie': await verifySessionStorage.commitSession(verifySession),
		},
	})
}

async function makeSession(
	{
		request,
		userId,
		redirectTo,
	}: { request: Request; userId: string; redirectTo?: string | null },
	responseInit?: ResponseInit,
) {
	redirectTo ??= '/'
	const session = await prisma.session.create({
		select: { id: true, expirationDate: true, userId: true },
		data: {
			expirationDate: getSessionExpirationDate(),
			userId,
		},
	})
	return handleNewSession(
		{ request, session, redirectTo, remember: true },
		responseInit,
	)
}
