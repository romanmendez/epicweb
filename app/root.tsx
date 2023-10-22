import { LiveReload, Scripts } from '@remix-run/react'
import { KCDShop } from './kcdshop.tsx'
import { LinksFunction } from '@remix-run/node'
import { Links } from '@remix-run/react'
import faviconAssetUrl from './assets/favicon.svg'
import fontStyleSheet from './styles/font.css'
import tailwindStyleSheet from './styles/tailwind.css'

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
		{
			rel: 'stylesheet',
			href: tailwindStyleSheet,
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
				<p className="p-8 text-xl">Hello Román</p>
				<Scripts />
				<KCDShop />
				<LiveReload />
			</body>
		</html>
	)
}
