import * as cookie from 'cookie'

const cookieName = 'theme'
export type Theme = 'light' | 'dark'

export function getTheme(request: Request): Theme {
	const cookieHeader = request.headers.get('cookie')
	if (cookieHeader) {
		const theme = cookie.parse(cookieHeader)[cookieName] || 'light'
		return theme as Theme
	}
	return 'light' as Theme
}

export function setTheme(theme: Theme) {
	return cookie.serialize('theme', theme, { path: '/' })
}
