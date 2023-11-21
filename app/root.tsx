import os from 'node:os'
import { cssBundleHref } from '@remix-run/css-bundle'
import {
	type DataFunctionArgs,
	json,
	type LinksFunction,
} from '@remix-run/node'
import {
	Link,
	Outlet,
	useLoaderData,
	type MetaFunction,
	useMatches,
} from '@remix-run/react'
import { csrf } from './utils/csrf.server.ts'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react'
import faviconAssetUrl from '#app/assets/favicon.svg'
import { Document } from '#app/components/document.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { SearchBar } from '#app/components/search-bar.tsx'
import fontStylestylesheetUrl from '#app/styles/font.css'
import tailwindStylesheetUrl from '#app/styles/tailwind.css'
import { getEnv } from '#app/utils/env.server.ts'
import { honeypot } from './utils/honeypot.server.ts'

export const links: LinksFunction = () => {
	return [
		{ rel: 'icon', type: 'image/svg+xml', href: faviconAssetUrl },
		{ rel: 'stylesheet', href: fontStylestylesheetUrl },
		{ rel: 'stylesheet', href: tailwindStylesheetUrl },
		cssBundleHref ? { rel: 'stylesheet', href: cssBundleHref } : null,
	].filter(Boolean)
}

export async function loader({ request }: DataFunctionArgs) {
	const [csrfToken, csrfCookieHeader] = await csrf.commitToken(request)
	return json(
		{
			username: os.userInfo().username,
			ENV: getEnv(),
			honeypotProps: honeypot.getInputProps(),
			csrfToken,
		},
		{
			headers: csrfCookieHeader
				? {
						'set-cookie': csrfCookieHeader,
				  }
				: {},
		},
	)
}

export function App() {
	const data = useLoaderData<typeof loader>()
	const matches = useMatches()
	const isNotHome = matches.find(m => m.pathname.match(/\/\S+/))
	const isOnSearchPage = matches.find(m => m.id === 'routes/users+/index')
	return (
		<Document>
			<header className="container mx-auto py-6">
				<nav className="flex items-center justify-between gap-6">
					{isNotHome ? (
						<Link to=".." relative="path">
							<div className="font-bold">back</div>
						</Link>
					) : (
						<Link to="/">
							<div className="font-light">epic</div>
							<div className="font-bold">notes</div>
						</Link>
					)}
					{isOnSearchPage ? null : (
						<div className="ml-auto max-w-sm flex-1">
							<SearchBar status="idle" />
						</div>
					)}
					<Link className="underline" to="/signup">
						Sign Up
					</Link>
				</nav>
			</header>
			<div className="flex-1">
				<Outlet />
			</div>
			<div className="container mx-auto flex justify-between">
				<Link to="/">
					<div className="font-light">epic</div>
					<div className="font-bold">notes</div>
				</Link>
				<p>Built with ♥️ by {data.username}</p>
			</div>
			<div className="h-5" />
			<script
				dangerouslySetInnerHTML={{
					__html: `window.ENV = ${JSON.stringify(data.ENV)}`,
				}}
			/>
		</Document>
	)
}

export default function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	return (
		<AuthenticityTokenProvider token={data.csrfToken}>
			<HoneypotProvider {...data.honeypotProps}>
				<App />
			</HoneypotProvider>
		</AuthenticityTokenProvider>
	)
}

export const meta: MetaFunction = () => {
	return [
		{ title: 'Epic Notes' },
		{
			name: 'description',
			content: 'A note taking app made during the Epic Web course',
		},
	]
}

export function ErrorBoundary() {
	return (
		<Document>
			<GeneralErrorBoundary
				statusHandlers={{
					404: () => <p>This page wasn't found for some reason.</p>,
				}}
			/>
		</Document>
	)
}
