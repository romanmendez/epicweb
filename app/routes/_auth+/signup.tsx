import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import {
	json,
	redirect,
	type DataFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import { Form, useActionData, useSearchParams } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { requireAnonymous } from '#app/utils/auth.server.ts'
import { validateCSRFToken } from '#app/utils/csrf.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { getDomainUrl, useIsPending } from '#app/utils/misc.tsx'
import { EmailSchema } from '#app/utils/user-validation.ts'
import { sendEmail } from '#app/utils/email.server.ts'
import { generateTOTP } from '@epic-web/totp'
import { codeQueryParam, targetQueryParam, typeQueryParam } from './verify.tsx'

const SignupSchema = z.object({
	email: EmailSchema,
	redirectTo: z.string().optional(),
})

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
		schema: SignupSchema.superRefine(async (data, ctx) => {
			const existingUser = await prisma.user.findUnique({
				where: { email: data.email },
				select: { id: true },
			})
			if (existingUser) {
				ctx.addIssue({
					path: ['email'],
					code: z.ZodIssueCode.custom,
					message: 'A user already exists with this email',
				})
				return
			}
		}),
		async: true,
	})
	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}
	if (!submission.value?.email) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}

	const type = 'onboarding'
	const { email } = submission.value
	const { otp, ...verificationConfig } = generateTOTP({
		algorithm: 'SHA256',
		period: 10 * 60, // 10 minutes
	})
	const verificationData = {
		type,
		target: email,
		...verificationConfig,
		expiresAt: new Date(Date.now() + verificationConfig.period * 1000),
	}
	await prisma.verification.upsert({
		where: { target_type: { target: email, type } },
		create: verificationData,
		update: verificationData,
	})

	const redirectToUrl = new URL(`${getDomainUrl(request)}/verify`)
	redirectToUrl.searchParams.set(typeQueryParam, type)
	redirectToUrl.searchParams.set(targetQueryParam, email)
	const verifyUrl = new URL(redirectToUrl)
	verifyUrl.searchParams.set(codeQueryParam, otp)

	const response = await sendEmail({
		to: email,
		subject: 'Welcome to Epic Notes!',
		text: `Here is your code: ${otp}. Or you can click on this: ${verifyUrl.toString()}`,
		html: '<p>This is the HTML version</p>',
	})
	console.log(response)

	if (response.status === 'success') {
		return redirect(redirectToUrl.toString())
	} else {
		return json({ status: 'error', submission } as const, { status: 400 })
	}
}
export const meta: MetaFunction = () => {
	return [{ title: 'Setup Epic Notes Account' }]
}

export default function SignupRoute() {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()

	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')

	const [form, fields] = useForm({
		id: 'signup-form',
		constraint: getFieldsetConstraint(SignupSchema),
		lastSubmission: actionData?.submission,
		defaultValue: { redirectTo },
		onValidate({ formData }) {
			const result = parse(formData, { schema: SignupSchema })
			return result
		},
		shouldRevalidate: 'onBlur',
	})
	console.log(actionData?.submission)

	return (
		<div className="container flex min-h-full flex-col justify-center pb-32 pt-20">
			<div className="mx-auto w-full max-w-lg">
				<div className="flex flex-col gap-3 text-center">
					<h1 className="text-h1">Let's start you journey!</h1>
					<p className="text-body-md text-muted-foreground">
						Please enter your email.
					</p>
				</div>
				<Spacer size="xs" />
				<Form
					method="POST"
					className="mx-auto min-w-[368px] max-w-sm"
					{...form.props}
				>
					<AuthenticityTokenInput />
					<HoneypotInputs />
					<Field
						labelProps={{ htmlFor: fields.email.id, children: 'Email' }}
						inputProps={{
							...conform.input(fields.email),
							autoComplete: 'email',
							autoFocus: true,
							className: 'lowercase',
						}}
						errors={fields.email.errors}
					/>
					<input {...conform.input(fields.redirectTo, { type: 'hidden' })} />
					<ErrorList errors={form.errors} id={form.errorId} />

					<div className="flex items-center justify-between gap-6">
						<StatusButton
							className="w-full"
							status={isPending ? 'pending' : actionData?.status ?? 'idle'}
							type="submit"
							disabled={isPending}
						>
							Submit
						</StatusButton>
					</div>
				</Form>
			</div>
		</div>
	)
}
