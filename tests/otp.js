import { generateTOTP } from '@epic-web/totp'
import readline from 'readline'

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
})

rl.question('Enter de OTP String: ', otpString => {
	const otpUri = new URL(otpString)
	const { secret, algorithm, digits, period } = Object.fromEntries(
		otpUri.searchParams.entries(),
	)

	const { otp } = generateTOTP({
		secret,
		algorithm,
		digits,
		period,
	})

	console.log('Generated OTP: ', otp)
	rl.close()
})
