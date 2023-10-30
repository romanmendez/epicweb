# Epic Web Course

An app built during the [Epic Web](https://epicweb.dev) course by Kent C. Dodds.

## Styling

This was a pretty simple module covering mostly how CSS is importated in Remix.
One of the things that was cool to refresh was all the dev tools that Chrome has
to look at whats happening when a page is loaded.

### Links To Public Files

When loading a website browser will automatically make a request to
`favicon.ico` if you don't have something configured. In the case of this app,
the server is configured to serve everything in the `/public` directory, which
includes a `favicon.ico` file, so the browser automatically uses that image.

In this exercises we are presented for the first time with the function exports
that Remix uses to populate our app components with data. In this case the
`links` function:

```js
import { type LinksFunction } from '@remix-run/node'

export const links: LinksFunction = () => {
	return [
		{
			rel: 'stylesheet',
			// all files in the public directory are served at the root of the site
			href: '/my-stylesheet.css',
		},
	]
}
```

### Asset Imports

The difference between just hard-coding the file in the href and using a asset
import is that Remix will add a hash to the files we import and that will allow
us to set the cache to be really long and any time we make any change to the
file that hash will change and it will break the hash.

## Professional Web Forms

Working almost exclusively in out `notes.$noteId_.edit.tsx` file

### Form Validation

We do client side form validation with the browser APIs using `maxLength` and
`required`. It works but it's not very informative. Doesn't provide much
feedback to the user. With the `maxLength` attribute all it does it limit the
number of characters you can type in the field. I guess I could add some text at
the bottom of the field to say what the max is.

### Server Validation

Here things get a little more complex. We create an errors object in our
`actions` function in which we distinguish between `formErrors` and
`fieldErrors`:

```js
	const errors: ActionErrors = {
		formErrors: [],
		fieldErrors: {
			title: [],
			content: [],
		},
	}
```

We check the data recieved from the form and conditionally populate this
`errors` object with the corresponding errors. Then we check the `errors` to see
if there's anything in the object and if there is we return from our action
early with a `json` object containing the errors:

```js
const hasErrors =
		errors.formErrors.length ||
		Object.values(errors.fieldErrors).some(fieldErrors => fieldErrors.length)

	if (hasErrors) {
		return json(
			{
				status: 'error',
				errors,
				// 🦺 the as const is here to help with our TypeScript inference
			} as const,
			{ status: 400 },
		)
	}
```

It seems like this could be done better, having to check the `errors` object
after we just wrote a bunch of conditions to decide if we put something in it
seems redundant.

The `as const` thing is cool. It tells Typescript that the `status` property is
not just any string, it's an `error` string and it also makes the object
`readonly` so no fields can be added to the object.

After all the server validation we need to display this information on the
client. For this we used `useActionData` for the first time. This hook returns
`undefined` when the component is first mounted cause no action has been sent by
the user yet, so we need to add the Elvis operators to check for the data that
it returns:

```js
const actionData = useActionData<typeof action>()

const fieldErrors =
		actionData?.status === 'error' ? actionData.errors.fieldErrors : null
	const formErrors =
		actionData?.status === 'error' ? actionData.errors.formErrors : null

```

And then we show the user the error with this new component:

```jsx
function ErrorList({ errors }: { errors?: Array<string> | null }) {
	return errors?.length ? (
		<ul className="flex flex-col gap-1">
			{errors.map((error, i) => (
				<li key={i} className="text-foreground-danger text-[10px]">
					{error}
				</li>
			))}
		</ul>
	) : null
}
```

Which we add bellow each input field:

```jsx
<div className="min-h-[32px] px-4 pb-3 pt-1">
	<ErrorList errors={fieldErrors?.title} />
</div>
```

### Disable Default Validation

Last thing we did was add a hook that checks for hydration to prevent the
default browser validation as soon as we have out JS on the page. This way we
can have the browser take care of some basic validation in case there is any
delay with the JS, and once it's ready we take over with our custom validation.

```js
function useHydrated() {
	const [hydrated, setHydrated] = useState(false)
	useEffect(() => setHydrated(true), [])
	return hydrated
}

export default function NoteEdit() {
	const isHydrated = useHydrated()

	return (
			<Form
				method="POST"
				noValidate={isHydrated}
			>
  )
```
