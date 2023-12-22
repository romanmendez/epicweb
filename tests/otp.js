import { generateTOTP } from '@epic-web/totp'

const otpUri = new URL(
	`otpauth://totp/Epic%20Notes:kody%40epicweb.dev?secret=RDTDGSEYLAPQZ5LQ&issuer=Epic+Notes&algorithm=SHA1&digits=6&period=30`,
)
const { secret, algorithm, digits, period } = Object.fromEntries(
	otpUri.searchParams.entries(),
)

const { otp } = generateTOTP({
	secret,
	algorithm,
	digits,
	period,
})

console.log(otp)
