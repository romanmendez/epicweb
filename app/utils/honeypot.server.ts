import { Honeypot } from 'remix-utils/honeypot/server'

export const honeypot = new Honeypot({
	validFromFieldName: process.env.TESTING ? null : '',
	encryptionSeed: process.env.HONEYPOT_SECRET,
})
