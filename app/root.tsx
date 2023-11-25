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
	useFetcher,
	useFetchers,
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
import { getTheme, setTheme, type Theme } from './utils/theme.server.ts'
import { useForm } from '@conform-to/react'
import { parse } from '@conform-to/zod'
import { z } from 'zod'
import { Icon } from './components/ui/icon.tsx'
import { ErrorList } from './components/forms.tsx'
import { invariantResponse } from './utils/misc.tsx'

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
			theme: getTheme(request),
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

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	invariantResponse(
		formData.get('intent') === 'update-theme',
		'Invalid indent',
		{ status: 400 },
	)
	const submission = parse(formData, { schema: ThemeFormSchema })

	if (submission.intent !== 'submit') {
		return json({ status: 'success', submission } as const)
	}
	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}
	const responseInit = {
		headers: {
			'set-cookie': setTheme(submission.value.theme),
		},
	}
	return json({ success: true, submission }, responseInit)
}

const ThemeFormSchema = z.object({
	theme: z.enum(['light', 'dark']),
})

export function App() {
	const data = useLoaderData<typeof loader>()
	const matches = useMatches()
	const theme = useTheme()
	console.log(theme)
	const isNotHome = matches.find(m => m.pathname.match(/\/\S+/))
	const isOnSearchPage = matches.find(m => m.id === 'routes/users+/index')
	return (
		<Document theme={theme} env={data.ENV}>
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
				<ThemeSwitch userPreference={theme} />
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

const themeFetcherKey = 'theme-fetcher'
function useTheme(): Theme {
	const data = useLoaderData<typeof loader>()
	const themeFetcher = useFetcher({ key: themeFetcherKey })
	const optimisticTheme = themeFetcher?.formData?.get('theme')
	if (optimisticTheme === 'light' || optimisticTheme === 'dark') {
		return optimisticTheme
	}
	return data.theme
}

function ThemeSwitch({ userPreference }: { userPreference?: Theme }) {
	const fetcher = useFetcher<typeof action>({ key: themeFetcherKey })
	const [form] = useForm({
		id: 'theme-switch',
		lastSubmission: fetcher.data?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: ThemeFormSchema })
		},
	})
	const mode = userPreference ?? 'light'
	const nextMode = mode === 'light' ? 'dark' : 'light'
	const modeLabel = {
		light: (
			<Icon name="sun">
				<span className="sr-only">Light</span>
			</Icon>
		),
		dark: (
			<Icon name="moon">
				<span className="sr-only">Dark</span>
			</Icon>
		),
	}

	return (
		<fetcher.Form method="POST">
			<input type="hidden" name="theme" value={nextMode} />
			<div className="flex gap-2">
				<button
					name="intent"
					value="update-theme"
					type="submit"
					className="flex h-8 w-8 cursor-pointer items-center justify-center"
				>
					{modeLabel[mode]}
				</button>
			</div>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
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
