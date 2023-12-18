import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import {
	json,
	redirect,
	type DataFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import { Form, Link, useActionData, useSearchParams } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { CheckboxField, ErrorList, Field } from '#app/components/forms.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { validateCSRFToken } from '#app/utils/csrf.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import {
	combineResponseInits,
	invariant,
	useIsPending,
} from '#app/utils/misc.tsx'
import { PasswordSchema, UsernameSchema } from '#app/utils/user-validation.ts'
import { sessionStorage } from '#app/utils/session.server.ts'
import {
	login,
	requireAnonymous,
	sessionIdKey,
} from '#app/utils/auth.server.ts'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { prisma } from '#app/utils/db.server.ts'
import { twoFAVerificationType } from '../settings+/profile.two-factor.tsx'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { type VerifyFunctionArgs, getRedirectToUrl } from './verify.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { ProviderConnectionForm } from '#app/utils/connections.tsx'

const LoginFormSchema = z.object({
	username: UsernameSchema,
	password: PasswordSchema,
	remember: z.boolean().optional(),
	redirectTo: z.string().optional(),
})

export const unverifiedSessionIdKey = 'unverified-session-id'
export const rememberMeKey = 'remember-me'
export const verifiedTimeKey = 'verified-time'
export const sessionExpirationTime = 1000 * 5 // 5 seconds for testing

export async function handleVerification({
	request,
	submission,
}: VerifyFunctionArgs) {
	invariant(submission.value, 'submission.value should be set by now')
	const userSession = await sessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const unverifiedSessionId = verifySession.get(unverifiedSessionIdKey)
	const remember = verifySession.get(rememberMeKey)
	const headers = new Headers()
	userSession.set(verifiedTimeKey, Date.now())

	if (unverifiedSessionId) {
		const session = await prisma.session.findUnique({
			where: { id: unverifiedSessionId },
			select: { expirationDate: true },
		})
		if (!session) {
			throw await redirectWithToast('/login', {
				type: 'error',
				title: 'Invalid session',
				description: 'Could not find the session. Please try again.',
			})
		}
		userSession.set(sessionIdKey, unverifiedSessionId)
		headers.append(
			'set-cookie',
			await sessionStorage.commitSession(userSession, {
				expires: remember ? session.expirationDate : undefined,
			}),
		)
	} else {
		headers.append(
			'set-cookie',
			await sessionStorage.commitSession(userSession),
		)
	}
	headers.append(
		'set-cookie',
		await verifySessionStorage.destroySession(verifySession),
	)
	return redirect(safeRedirect(submission.value.redirectTo), { headers })
}

export async function shouldRequestTwoFA({
	request,
	userId,
}: {
	request: Request
	userId: string
}) {
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const unverifiedSession = verifySession.get(unverifiedSessionIdKey)
	if (unverifiedSession) return true

	const verification = await prisma.verification.findUnique({
		where: { target_type: { target: userId, type: twoFAVerificationType } },
		select: { id: true },
	})
	const userHasTwoFA = Boolean(verification)
	if (!userHasTwoFA) return false

	const userSession = await sessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const verifiedTime = new Date(userSession.get(verifiedTimeKey) ?? 0)
	return Date.now() - verifiedTime.getTime() > sessionExpirationTime
}

export async function handleNewSession(
	{
		request,
		session,
		remember = false,
		redirectTo,
	}: {
		request: Request
		session: { userId: string; id: string; expirationDate: Date }
		remember?: Boolean
		redirectTo?: string
	},
	responseInit?: ResponseInit,
) {
	if (await shouldRequestTwoFA({ request, userId: session.userId })) {
		const verifySession = await verifySessionStorage.getSession()
		verifySession.set(unverifiedSessionIdKey, session.id)
		verifySession.set(rememberMeKey, remember)

		const redirectUrl = getRedirectToUrl({
			request,
			type: twoFAVerificationType,
			target: session.userId,
			redirectTo,
		})
		return redirect(
			redirectUrl.toString(),
			combineResponseInits(
				{
					headers: {
						'set-cookie':
							await verifySessionStorage.commitSession(verifySession),
					},
				},
				responseInit,
			),
		)
	}

	const userSession = await sessionStorage.getSession(
		request.headers.get('cookie'),
	)
	userSession.set(sessionIdKey, session.id)

	return redirect(
		safeRedirect(redirectTo, '/'),
		combineResponseInits(
			{
				headers: {
					'set-cookie': await sessionStorage.commitSession(userSession, {
						expires: remember ? session.expirationDate : undefined,
					}),
				},
			},
			responseInit,
		),
	)
}

export async function loader({ request }: DataFunctionArgs) {
	await requireAnonymous(request)
	return json({})
}

export async function action({ request }: DataFunctionArgs) {
	await requireAnonymous(request)
	const formData = await request.formData()
	await validateCSRFToken(formData, request.headers)
	checkHoneypot(formData)

	const submission = await parse(formData, {
		schema: intent =>
			LoginFormSchema.transform(async (data, ctx) => {
				if (intent !== 'submit') return { ...data, session: null }

				const session = await login(data)
				if (!session) {
					ctx.addIssue({
						code: 'custom',
						message: 'Invalid username or password',
					})
					return z.NEVER
				}
				return { ...data, session }
			}),
		async: true,
	})
	// get the password off the payload that's sent back
	delete submission.payload.password

	if (submission.intent !== 'submit') {
		// @ts-expect-error - conform should probably have support for doing this
		delete submission.value?.password
		return json({ status: 'idle', submission } as const)
	}
	if (!submission.value?.session) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}

	return await handleNewSession({ request, ...submission.value })
}

export default function LoginPage() {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')

	const [form, fields] = useForm({
		id: 'login-form',
		constraint: getFieldsetConstraint(LoginFormSchema),
		defaultValue: { redirectTo },
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: LoginFormSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<div className="flex min-h-full flex-col justify-center pb-32 pt-20">
			<div className="mx-auto w-full max-w-md">
				<div className="flex flex-col gap-3 text-center">
					<h1 className="text-h1">Welcome back!</h1>
					<p className="text-body-md text-muted-foreground">
						Please enter your details.
					</p>
				</div>
				<Spacer size="xs" />

				<div>
					<div className="mx-auto w-full max-w-md px-8">
						<Form method="POST" {...form.props}>
							<AuthenticityTokenInput />
							<HoneypotInputs />
							<Field
								labelProps={{ children: 'Username' }}
								inputProps={{
									...conform.input(fields.username),
									autoFocus: true,
									className: 'lowercase',
								}}
								errors={fields.username.errors}
							/>

							<Field
								labelProps={{ children: 'Password' }}
								inputProps={conform.input(fields.password, {
									type: 'password',
								})}
								errors={fields.password.errors}
							/>

							<div className="flex justify-between">
								<CheckboxField
									labelProps={{
										htmlFor: fields.remember.id,
										children: 'Remember me',
									}}
									buttonProps={conform.input(fields.remember, {
										type: 'checkbox',
									})}
									errors={fields.remember.errors}
								/>
								<div>
									<Link
										to="/forgot-password"
										className="text-body-xs font-semibold"
									>
										Forgot password?
									</Link>
								</div>
							</div>

							<input
								{...conform.input(fields.redirectTo, { type: 'hidden' })}
							/>
							<ErrorList errors={form.errors} id={form.errorId} />

							<div className="flex items-center justify-between gap-6 pt-3">
								<StatusButton
									className="w-full"
									status={isPending ? 'pending' : actionData?.status ?? 'idle'}
									type="submit"
									disabled={isPending}
								>
									Log in
								</StatusButton>
							</div>
						</Form>
						<div className="mt-5 flex flex-col gap-5 border-b-2 border-t-2 border-border py-3">
							<ProviderConnectionForm type="Login" providerName="github" />
						</div>

						<div className="flex items-center justify-center gap-2 pt-6">
							<span className="text-muted-foreground">New here?</span>
							<Link
								to={
									redirectTo ? `/signup?${searchParams.toString()}` : `/signup`
								}
							>
								Create an account
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export const meta: MetaFunction = () => {
	return [{ title: 'Login to Epic Notes' }]
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
