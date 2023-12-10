import { Outlet } from '@remix-run/react'
import { Icon } from '#app/components/ui/icon.tsx'
import { type VerificationType } from '../_auth+/verify.tsx'

export const handle = {
	breadcrumb: <Icon name="lock-closed">2FA</Icon>,
}

export const twoFAVerificationType = '2fa' satisfies VerificationType

export default function TwoFactorRoute() {
	return <Outlet />
}
