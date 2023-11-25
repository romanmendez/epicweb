import { type Theme } from '#app/utils/theme.server.ts'
import {
	Meta,
	Links,
	ScrollRestoration,
	Scripts,
	LiveReload,
} from '@remix-run/react'

export function Document({
	children,
	theme,
	env,
}: {
	children: React.ReactNode
	theme?: Theme
	env?: Record<string, string>
}) {
	return (
		<html lang="en" className={`${theme} h-full overflow-x-hidden`}>
			<head>
				<Meta />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<meta name="charSet" content="utf-8" />
				<Links />
			</head>
			<body className="flex h-full flex-col justify-between bg-background text-foreground">
				{children ?? null}
				<script
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(env)}`,
					}}
				/>
				<ScrollRestoration />
				<Scripts />
				<LiveReload />
			</body>
		</html>
	)
}
