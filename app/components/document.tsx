import {
	Meta,
	Links,
	ScrollRestoration,
	Scripts,
	LiveReload,
} from '@remix-run/react'

export function Document({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="h-full overflow-x-hidden">
			<head>
				<Meta />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<meta name="charSet" content="utf-8" />
				<Links />
			</head>
			<body className="flex h-full flex-col justify-between bg-background text-foreground">
				{children ?? null}
				<ScrollRestoration />
				<Scripts />
				<LiveReload />
			</body>
		</html>
	)
}
