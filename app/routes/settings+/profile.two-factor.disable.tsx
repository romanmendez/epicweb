import { json, type DataFunctionArgs } from '@remix-run/node'
import { Form } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	getRedirectToUrl,
	requireUserId,
	twoFAVerificationType,
} from '#app/utils/auth.server.ts'
import { validateCSRFToken } from '#app/utils/csrf.server.ts'
import { useDoubleCheck, useIsPending } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { shouldRequestTwoFA } from '../_auth+/login.tsx'

export const handle = {
	breadcrumb: <Icon name="lock-open-1">Disable</Icon>,
}

async function requireRecentVerification({
	request,
	userId,
}: {
	request: Request
	userId: string
}) {
	const shouldReverify = await shouldRequestTwoFA({ request, userId })
	const reqUrl = new URL(request.url)
	const redirectUrl = getRedirectToUrl({
		request,
		type: twoFAVerificationType,
		target: userId,
		redirectTo: reqUrl.pathname + reqUrl.search,
	})
	if (shouldReverify) {
		throw await redirectWithToast(redirectUrl.toString(), {
			type: 'message',
			title: 'Please Revirify',
			description: 'You must reverify your account to proceed.',
		})
	}
}

export async function loader({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	await requireRecentVerification({ request, userId })
	return json({})
}

export async function action({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	await requireRecentVerification({ request, userId })
	const formData = await request.formData()
	await validateCSRFToken(formData, request.headers)

	await prisma.verification.delete({
		where: { target_type: { target: userId, type: twoFAVerificationType } },
	})
	throw await redirectWithToast('/settings/profile/two-factor', {
		title: '2FA Disabled',
		type: 'success',
		description: 'You have disabled 2FA',
	})
}

export default function TwoFactorDisableRoute() {
	const isPending = useIsPending()
	const dc = useDoubleCheck()

	return (
		<div className="mx-auto max-w-sm">
			<Form method="POST">
				<AuthenticityTokenInput />
				<p>
					Disabling two factor authentication is not recommended. However, if
					you would like to do so, click here:
				</p>
				<StatusButton
					variant="destructive"
					status={isPending ? 'pending' : 'idle'}
					disabled={isPending}
					{...dc.getButtonProps({
						className: 'mx-auto',
						name: 'intent',
						value: 'disable',
						type: 'submit',
					})}
				>
					{dc.doubleCheck ? 'Are you sure?' : 'Disable 2FA'}
				</StatusButton>
			</Form>
		</div>
	)
}
