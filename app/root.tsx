import { LiveReload, Scripts } from '@remix-run/react'
import { KCDShop } from './kcdshop.tsx'
import { LinksFunction } from '@remix-run/node'
import { Links } from '@remix-run/react'
import faviconAssetUrl from './assets/favicon.svg'
import fontStyleSheet from './styles/font.css'

export const links: LinksFunction = () => {
	return [
		{
			rel: 'icon',
			type: 'image/svg+xml',
			href: faviconAssetUrl,
		},
		{
			rel: 'stylesheet',
			href: fontStyleSheet,
		},
	]
}

export default function App() {
	return (
		<html lang="en">
			<head>
				<Links />
			</head>
			<body>
				<p>Hello Román</p>
				<Scripts />
				<KCDShop />
				<LiveReload />
			</body>
		</html>
	)
}
