import { type Submission, conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { json, type DataFunctionArgs } from '@remix-run/node'
import {
	Form,
	useActionData,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { validateCSRFToken } from '#app/utils/csrf.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { generateTOTP, verifyTOTP } from '@epic-web/totp'
import { handleVerification as handleOnboardingVerification } from './onboarding.tsx'
import { handleVerification as handleResetPasswordVerification } from './reset-password.tsx'
import { handleVerification as handleChangeEmailVerification } from '../settings+/profile.change-email.tsx'
import { handleVerification as handle2FAVerification } from './login.tsx'
import { type twoFAVerifyVerificationType } from '../settings+/profile.two-factor.verify.tsx'
import {
	codeQueryParam,
	getRedirectToUrl,
	redirectToQueryParam,
	targetQueryParam,
	typeQueryParam,
} from '#app/utils/auth.server.ts'

const VerificationTypeSchema = z.enum([
	'onboarding',
	'reset-password',
	'change-email',
	'2fa',
] as const)
type VerificationType = z.infer<typeof VerificationTypeSchema>

const VerifySchema = z.object({
	[codeQueryParam]: z.string().min(6).max(6),
	[typeQueryParam]: VerificationTypeSchema,
	[targetQueryParam]: z.string(),
	[redirectToQueryParam]: z.string().optional(),
})

export async function loader({ request }: DataFunctionArgs) {
	const params = new URL(request.url).searchParams
	const verifyParser = VerificationTypeSchema.parse

	return json({
		status: 'idle',
		typeQueryParam,
		verifyParser,
		submission: {
			intent: '',
			payload: Object.fromEntries(params) as Record<string, unknown>,
			error: {} as Record<string, Array<string>>,
		},
	} as const)
}

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	await validateCSRFToken(formData, request.headers)
	return validateRequest(request, formData)
}

export async function prepareVerification({
	period,
	request,
	type,
	target,
	redirectTo: postVerificationRedirectTo,
}: {
	period: number
	request: Request
	type: VerificationType
	target: string
	redirectTo?: string
}) {
	const { otp, ...verificationConfig } = generateTOTP({
		algorithm: 'SHA256',
		period,
	})
	const verificationData = {
		type,
		target,
		...verificationConfig,
		expiresAt: new Date(Date.now() + verificationConfig.period * 1000),
	}
	await prisma.verification.upsert({
		where: { target_type: { target, type } },
		create: verificationData,
		update: verificationData,
	})

	const verifyUrl = getRedirectToUrl({
		request,
		type,
		target,
		redirectTo: postVerificationRedirectTo,
	})
	const redirectTo = new URL(verifyUrl.toString())
	verifyUrl.searchParams.set(codeQueryParam, otp)

	return { verifyUrl, redirectTo, otp }
}

export type VerifyFunctionArgs = {
	request: Request
	submission: Submission<z.infer<typeof VerifySchema>>
	body: FormData | URLSearchParams
}

export async function isCodeValid({
	code,
	type,
	target,
}: {
	code: string
	type: VerificationType | typeof twoFAVerifyVerificationType
	target: string
}) {
	const verification = await prisma.verification.findUnique({
		select: { algorithm: true, secret: true, period: true, charSet: true },
		where: {
			target_type: {
				target,
				type,
			},
			OR: [{ expiresAt: { gte: new Date(Date.now()) } }, { expiresAt: null }],
		},
	})
	if (!verification) return false
	const result = verifyTOTP({
		otp: code,
		algorithm: verification.algorithm,
		secret: verification.secret,
		period: verification.period,
		charSet: verification.charSet,
	})
	if (!result) return false

	return true
}
async function validateRequest(
	request: Request,
	body: URLSearchParams | FormData,
) {
	const submission = await parse(body, {
		schema: () =>
			VerifySchema.superRefine(async (data, ctx) => {
				const codeIsValid = await isCodeValid(data)
				if (!codeIsValid) {
					ctx.addIssue({
						path: ['code'],
						code: z.ZodIssueCode.custom,
						message: `Invalid code`,
					})
					return z.NEVER
				}
			}),

		async: true,
	})

	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}
	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}

	const { target, type: verificationType } = submission.value

	async function deleteVerification() {
		await prisma.verification.delete({
			where: { target_type: { target, type: verificationType } },
		})
	}

	switch (verificationType) {
		case 'onboarding': {
			await deleteVerification()
			return handleOnboardingVerification({ request, body, submission })
		}
		case 'reset-password': {
			await deleteVerification()
			return handleResetPasswordVerification({ request, body, submission })
		}
		case 'change-email': {
			await deleteVerification()
			return handleChangeEmailVerification({ request, body, submission })
		}
		case '2fa': {
			return handle2FAVerification({ request, body, submission })
		}
	}
}

export default function VerifyRoute() {
	const data = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()
	const isPending = useIsPending()
	const actionData = useActionData<typeof action>()
	const type = VerificationTypeSchema.parse(
		searchParams.get(data.typeQueryParam),
	)

	const checkEmail = (
		<>
			<h1 className="text-h1">Check your email</h1>
			<p className="mt-3 text-body-md text-muted-foreground">
				We've sent you a code to verify your email address.
			</p>
		</>
	)

	const headings: Record<VerificationType, React.ReactNode> = {
		onboarding: checkEmail,
		'reset-password': checkEmail,
		'change-email': checkEmail,
		'2fa': (
			<>
				<h1 className="text-h1">Check your 2FA app</h1>
				<p className="mt-3 text-body-md text-muted-foreground">
					Please enter your 2FA code to verify your identity.
				</p>
			</>
		),
	}

	const [form, fields] = useForm({
		id: 'verify-form',
		constraint: getFieldsetConstraint(VerifySchema),
		lastSubmission: actionData?.submission ?? data.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: VerifySchema })
		},
		defaultValue: {
			code: searchParams.get(codeQueryParam) ?? '',
			type,
			target: searchParams.get(targetQueryParam) ?? '',
			redirectTo: searchParams.get(redirectToQueryParam) ?? '',
		},
	})

	return (
		<div className="container flex flex-col justify-center pb-32 pt-20">
			<div className="text-center">{headings[type]}</div>

			<Spacer size="xs" />

			<div className="mx-auto flex w-72 max-w-full flex-col justify-center gap-1">
				<div>
					<ErrorList errors={form.errors} id={form.errorId} />
				</div>
				<div className="flex w-full gap-2">
					<Form method="POST" {...form.props} className="flex-1">
						<AuthenticityTokenInput />
						<Field
							labelProps={{
								htmlFor: fields[codeQueryParam].id,
								children: 'Code',
							}}
							inputProps={conform.input(fields[codeQueryParam])}
							errors={fields[codeQueryParam].errors}
						/>
						<input
							{...conform.input(fields[typeQueryParam], { type: 'hidden' })}
						/>
						<input
							{...conform.input(fields[targetQueryParam], { type: 'hidden' })}
						/>
						<input
							{...conform.input(fields[redirectToQueryParam], {
								type: 'hidden',
							})}
						/>
						<StatusButton
							className="w-full"
							status={isPending ? 'pending' : actionData?.status ?? 'idle'}
							type="submit"
							disabled={isPending}
						>
							Submit
						</StatusButton>
					</Form>
				</div>
			</div>
		</div>
	)
}
