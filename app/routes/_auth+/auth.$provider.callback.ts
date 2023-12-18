import { authenticator, getUserId } from '#app/utils/auth.server.ts'
import { ProviderNameSchema, providerLabels } from '#app/utils/connections.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type DataFunctionArgs } from '@remix-run/node'

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
	throw await redirectWithToast('/login', {
		title: 'Auth Success (jk)',
		description: `You have successfully authenticated with ${label} (not really though...).`,
		type: 'success',
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

