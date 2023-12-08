import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import {
	json,
	type DataFunctionArgs,
	type MetaFunction,
	redirect,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { invariant, useIsPending } from '#app/utils/misc.tsx'
import { PasswordSchema } from '#app/utils/user-validation.ts'
import { type VerifyFunctionArgs } from './verify.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { requireAnonymous, resetUserPassword } from '#app/utils/auth.server.ts'

export const resetPasswordUsername = 'resetPasswordUsername'

export async function handleVerification({
	request,
	submission,
}: VerifyFunctionArgs) {
	invariant(submission.value, 'submission.value shouls be set by now.')
	const user = await prisma.user.findFirst({
		where: {
			OR: [
				{ email: submission.value.target },
				{ username: submission.value.target },
			],
		},
		select: { email: true, username: true },
	})
	if (!user) {
		submission.error.code = ['Invalid code']
		return json(
			{
				status: 'error',
				submission,
			},
			{ status: 400 },
		)
	}
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	verifySession.set(resetPasswordUsername, user.username)

	return redirect('/reset-password', {
		headers: {
			'set-cookie': await verifySessionStorage.commitSession(verifySession),
		},
	})
}

const ResetPasswordSchema = z
	.object({
		password: PasswordSchema,
		confirmPassword: PasswordSchema,
	})
	.refine(({ confirmPassword, password }) => password === confirmPassword, {
		message: 'The passwords did not match',
		path: ['confirmPassword'],
	})

async function requireResetPasswordUsername(request: Request) {
	await requireAnonymous(request)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const username = verifySession.get(resetPasswordUsername)
	if (typeof username !== 'string' || !username) {
		throw redirect('/login')
	}
	return username
}

export async function loader({ request }: DataFunctionArgs) {
	const resetPasswordUsername = await requireResetPasswordUsername(request)
	return json({ resetPasswordUsername })
}

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	const username = await requireResetPasswordUsername(request)
	const submission = parse(formData, {
		schema: ResetPasswordSchema,
	})
	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}
	if (!submission.value?.password) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}

	const { password } = submission.value
	await resetUserPassword({ username, password })

	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)

	return redirect('/login', {
		headers: {
			'set-cookie': await verifySessionStorage.destroySession(verifySession),
		},
	})
}

export const meta: MetaFunction = () => {
	return [{ title: 'Reset Password | Epic Notes' }]
}

export default function ResetPasswordPage() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'reset-password',
		constraint: getFieldsetConstraint(ResetPasswordSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: ResetPasswordSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<div className="container flex flex-col justify-center pb-32 pt-20">
			<div className="text-center">
				<h1 className="text-h1">Password Reset</h1>
				<p className="mt-3 text-body-md text-muted-foreground">
					Hi, {data.resetPasswordUsername}. No worries. It happens all the time.
				</p>
			</div>
			<div className="mx-auto mt-16 min-w-[368px] max-w-sm">
				<Form method="POST" {...form.props}>
					<Field
						labelProps={{
							htmlFor: fields.password.id,
							children: 'New Password',
						}}
						inputProps={{
							...conform.input(fields.password, { type: 'password' }),
							autoComplete: 'new-password',
							autoFocus: true,
						}}
						errors={fields.password.errors}
					/>
					<Field
						labelProps={{
							htmlFor: fields.confirmPassword.id,
							children: 'Confirm Password',
						}}
						inputProps={{
							...conform.input(fields.confirmPassword, { type: 'password' }),
							autoComplete: 'new-password',
						}}
						errors={fields.confirmPassword.errors}
					/>

					<ErrorList errors={form.errors} id={form.errorId} />

					<StatusButton
						className="w-full"
						status={isPending ? 'pending' : actionData?.status ?? 'idle'}
						type="submit"
						disabled={isPending}
					>
						Reset password
					</StatusButton>
				</Form>
			</div>
		</div>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
