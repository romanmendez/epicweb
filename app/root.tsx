import { LiveReload, Scripts } from '@remix-run/react'
import { KCDShop } from './kcdshop.tsx'
import { LinksFunction } from '@remix-run/node'
import { Links } from '@remix-run/react'
import { cssBundleHref } from '@remix-run/css-bundle'
import faviconAssetUrl from './assets/favicon.svg'
import fontStyleSheet from './styles/font.css'
import tailwindStyleSheet from './styles/tailwind.css'
import './styles/global.css'

/*
Typescript is complaining because cssBundleHref return 'string || undefined'
and the LinksFunction expects a return of only 'string'. To fix that we add
a conditional statement in out array and filter for it so our final array either
contains the cssBundleHref with the string or it doesn't.

*/
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
		cssBundleHref
			? {
					rel: 'stylesheet',
					href: cssBundleHref,
			  }
			: null,
	].filter(Boolean)
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
