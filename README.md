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

![Full Stack Foundations Certificate](https://www.epicweb.dev/api/certificate?moduleId=deb1eeaf-7f3a-4dff-81a1-9f07826693c2&userId=c37b5fcf-6d84-4015-a924-fc1a7bbdd7a2)

# Professional Web Forms

## Form Validation

Working almost exclusively in out `notes.$noteId_.edit.ts` file

### Form Validation

We do client side form validation with the browser APIs using `maxLength` and
`required`. It works but it's not very informative. Doesn't provide much
feedback to the user. With the `maxLength` attribute all it does it limit the
number of characters you can type in the field. I guess I could add some text at
the bottom of the field to say what the max is.

### Server Validation

Here things get a little more complex. We create an errors object in our
`actions` function in which we distinguish between `formErrors` andq
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

```js
<div className="min-h-[32px] px-4 pb-3 pt-1">
	<ErrorList errors={fieldErrors?.title} />
</div>
```

### Disable Default Validation

Last thing we did was add a hook that checks for hydration to prevent the
default browser validation as soon as we have out JS on the page. This way we
can have the browser take care of some basic validation in case there is any
delay with the JS, and once it's ready we take over with our custom validation.

```jsx
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
}
```

## Accessibility

### Field Labels

Labels are associated to the input with `for` and `id`. Labels are important for
#accessibility

```html
<form id="my-form">
	<label for="color">Favorite Color</label>
	<input id="color" type="text" />
</form>
```

With [[React]] we substitule `for` for `htmlFor`:

```tsx
export function App() {
	return (
		<form id="my-form">
			<label htmlFor="color">Favorite Color</label>
			<input id="color" type="text" />
		</form>
	)
}
```

### Validation `aria` attributes

When displaying errors in the form submission we add the `aria` labels for
#accessibility.

```html
<form>
	<label class="..." for="note-title">Title</label>
	<input
		class="..."
		id="note-title"
		name="title"
		aria-invalid="true"
		aria-describedby="title-error"
	/>
	<div class="...">
		<ul id="title-error" class="...">
			<li class="...">Title must be at least 1 character</li>
		</ul>
	</div>
</form>
```

The `aria-invialid` and `aria-describedby` labels are only present when there is
an error. So in [[React]] we use a conditional operator:

```tsx
<input
	aria-invalid={hasErrors || undefined}
	aria-describedby={hasErrors ? 'id' : undefined}
/>
```

### Focus Management

`autoFocus` will automatically focus the input you place it on when the form is
rendered:

```html
<form>
	<label class="..." for="note-title">Title</label>
	<input autofocus class="..." id="note-title" name="title" />
</form>
```

Custom hook to autofocus input field after invalid form submission. The
`errorNode` is needed only as a way to trigger the `useEffect` hook when the
form is submitted twice in a row with errors, because the children of `formEl`
are not tracked.

```jsx
function useFocusInvalid(formEl: HTMLFormElement | null, hasErrors: boolean) {
	const errorNode = formEl?.querySelectorAll('[aria-invalid="true"]');
	useEffect(() => {
		if (!formEl) return;
		if (!hasErrors) return;
		if (formEl.matches('[aria-invalid="true"]')) {
			formEl.focus();
		} else {
			const firstErrorElement = formEl.querySelector(
				'[aria-invalid="true"]'
			);
			if (firstErrorElement instanceof HTMLElement)
				firstErrorElement.focus();
		}
	}, [hasErrors, formEl]);
}
```

After playing with this hook I realized the effect wouldn't get triggered if the
form was submitted twice in a row with errors, even if they were different
errors, cause the `formEl` ref doesn't keep track of changes in it's children.
So I added this to the dependencies of `useEffect` in the hook:

```jsx
const errorNode = formEl?.querySelectorAll('[aria-invalid="true"]')
```

## Schema Validation

### Zod Schema Validation

By adding a Zod schema to our forma validation we are able to turn this:

```ts
type ActionErrors = {
	formErrors: Array<string>
	fieldErrors: {
		title: Array<string>
		content: Array<string>
	}
}

const titleMaxLength = 100
const contentMaxLength = 10000

export async function action({ request, params }: DataFunctionArgs) {
	invariantResponse(params.noteId, 'noteId param is required')

	const formData = await request.formData()
	const title = formData.get('title')
	const content = formData.get('content')
	invariantResponse(typeof title === 'string', 'title must be a string')
	invariantResponse(typeof content === 'string', 'content must be a string')

	const errors: ActionErrors = {
		formErrors: [],
		fieldErrors: {
			title: [],
			content: [],
		},
	}

	if (title === '') {
		errors.fieldErrors.title.push('Title is required')
	}
	if (title.length > titleMaxLength) {
		errors.fieldErrors.title.push('Title must be at most 100 characters')
	}
	if (content === '') {
		errors.fieldErrors.content.push('Content is required')
	}
	if (content.length > contentMaxLength) {
		errors.fieldErrors.content.push('Content must be at most 10000 characters')
	}

	const hasErrors =
		errors.formErrors.length ||
		Object.values(errors.fieldErrors).some(fieldErrors => fieldErrors.length)
	if (hasErrors) {
		return json({ status: 'error', errors } as const, { status: 400 })

		await updateNote({ id: params.noteId, title, content })
	}
}
```

Into this:

```ts
import { z } from 'zod'

const titleMaxLength = 100
const contentMaxLength = 10000

const NoteEditorSchema = z.object({
	title: z.string().min(1).max(titleMaxLength),
	content: z.string().min(1).max(contentMaxLength),
})

export async function action({ request, params }: DataFunctionArgs) {
	invariantResponse(params.noteId, 'noteId param is required')

	const formData = await request.formData()
	const result = NoteEditorSchema.safeParse({
		title: formData.get('title'),
		content: formData.get('content'),
	})

	if (!result.success) {
		return json({ status: 'error', errors: result.error.flatten() } as const, {
			status: 400,
		})
	}
	const { title, content } = result.data

	await updateNote({ id: params.noteId, title, content })
}
```

`result` with success looks like this:

```js
	{
		success: true,
		data: {
			title: 'Koalas like to cuddle',
			content: 'Cuddly critters, koalas measure about 60cm to 85cm long, and weigh about 14kg.'
		}
	}
```

and with errors (after `.flatten()`)looks like this:

```js
	{
		success: false,
		error: {
			formErrors: [],
    	fieldErrors: {
			name: ['Expected string, received null'],
      contactInfo: ['Invalid email']
    	},
		}
  }
```

### Conform Action Utils

Once we add Conform to our backend validation we get this:

```ts
import { parse } from '@conform-to/zod'
import { z } from 'zod'

const titleMaxLength = 100
const contentMaxLength = 10000

const NoteEditorSchema = z.object({
	title: z.string().min(1).max(titleMaxLength),
	content: z.string().min(1).max(contentMaxLength),
})

export async function action({ request, params }: DataFunctionArgs) {
	invariantResponse(params.noteId, 'noteId param is required')

	const formData = await request.formData()
	// we substitute the Zod parser for the Conform parser so we can use Conform on the front end as well.
	const submission = parse(formData, { schema: NoteEditorSchema })

	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}
	const { title, content } = submission.value

	await updateNote({ id: params.noteId, title, content })
}
```

`submission` with success looks like this:

```js
{
	intent: 'submit',
	payload: {
		title: 'Basic Koala Facts',
		content: 'Koalas are found in the eucalyptus forests of eastern Australia. They have grey fur with a cream-coloured chest, and strong, clawed feet, perfect for living in the branches of trees!'
	},
	error: {},
	value: {
		title: 'Basic Koala Facts',
		content: 'Koalas are found in the eucalyptus forests of eastern Australia. They have grey fur with a cream-coloured chest, and strong, clawed feet, perfect for living in the branches of trees!'
	}
}
```

and with errors:

```js
{
	intent: 'submit',
	payload: {
		title: 'Basic Koala Facts',
		content: 'Koalas are found in the eucalyptus forests of eastern Australia. They have grey fur with a cream-coloured chest, and strong, clawed feet, perfect for living in the branches of trees!'
	},
	error: { title: [ 'String must contain at least 100 character(s)' ] }
}
```

### Conform Form Utils

On the front-end we start with this:

```tsx
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { useForm } from '@conform-to/react'

function useHydrated() {
	const [hydrated, setHydrated] = useState(false)
	useEffect(() => setHydrated(true), [])
	return hydrated
}

export default function NoteEdit() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const formRef = useRef<HTMLFormElement>(null)
	const isSubmitting = useIsSubmitting()

	const fieldErrors =
		actionData?.status === 'error' ? actionData.submission.error : null
	const formErrors =
		actionData?.status === 'error' ? actionData.submission.error[''] : null
	const isHydrated = useHydrated()

	const formHasErrors = Boolean(formErrors?.length)
	const formErrorId = formHasErrors ? 'form-error' : undefined
	const titleHasErrors = Boolean(fieldErrors?.title?.length)
	const titleErrorId = titleHasErrors ? 'title-error' : undefined
	const contentHasErrors = Boolean(fieldErrors?.content?.length)
	const contentErrorId = contentHasErrors ? 'content-error' : undefined

	useFocusInvalid(formRef.current, actionData?.status === 'error')

	const [form, fields] = useForm({
		id: 'note-editor',
		constraint: getFieldsetConstraint(NoteEditorSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: NoteEditorSchema })
		},
		defaultValue: {
			title: data.note.title,
			content: data.note.content,
		},
	})

	return (
		<div className="absolute inset-0">
			<Form
				noValidate={isHydrated}
				method="post"
				className="flex h-full flex-col gap-y-4 overflow-y-auto overflow-x-hidden px-10 pb-28 pt-12"
				aria-invalid={formHasErrors || undefined}
				aria-describedby={formErrorId}
				ref={formRef}
				tabIndex={-1}
				{...form.props}
			>
				<div className="flex flex-col gap-1">
					<div>
						<Label htmlFor="note-title">Title</Label>
						<Input
							id="note-title"
							name="title"
							defaultValue={data.note.title}
							required
							maxLength={titleMaxLength}
							aria-invalid={titleHasErrors || undefined}
							aria-describedby={titleErrorId}
							autoFocus
						/>
						<Label htmlFor={fields.title.id}>Title</Label>
						<Input autoFocus {...conform.input(fields.title)} />
						<div className="min-h-[32px] px-4 pb-3 pt-1">
							<ErrorList id={titleErrorId} errors={fieldErrors?.title} />
							<ErrorList
								id={fields.title.errorId}
								errors={fields.title.errors}
							/>
						</div>
					</div>
					<div>
						<Label htmlFor="note-content">Content</Label>
						<Textarea
							id="note-content"
							name="content"
							defaultValue={data.note.content}
							required
							maxLength={contentMaxLength}
							aria-invalid={contentHasErrors || undefined}
							aria-describedby={contentErrorId}
						/>
						<Label htmlFor={fields.content.id}>Content</Label>
						<Textarea {...conform.textarea(fields.content)} />
						<div className="min-h-[32px] px-4 pb-3 pt-1">
							<ErrorList id={contentErrorId} errors={fieldErrors?.content} />
							<ErrorList
								id={fields.content.errorId}
								errors={fields.content.errors}
							/>
						</div>
					</div>
				</div>
				<ErrorList id={formErrorId} errors={formErrors} />
				<ErrorList id={form.errorId} errors={form.errors} />
			</Form>
			<div className={floatingToolbarClassName}>
				<Button form={form.id} variant="destructive" type="reset">
					Reset
				</Button>
				<StatusButton
					form={form.id}
					type="submit"
					disabled={isSubmitting}
					status={isSubmitting ? 'pending' : 'idle'}
				>
					Submit
				</StatusButton>
			</div>
		</div>
	)
}
```

And we essentially replace all the error logic with the `useForm` from
`conform-to/react` hook that uses the Zod schema to check for errors and then
letting `conform` fill out all of our field props with
`conform.[typeOfInput](fields[nameOfField])`:

```tsx
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { conform, useForm } from '@conform-to/react'

export default function NoteEdit() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const isSubmitting = useIsSubmitting()

	const [form, fields] = useForm({
		id: 'note-editor',
		constraint: getFieldsetConstraint(NoteEditorSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: NoteEditorSchema })
		},
		defaultValue: {
			title: data.note.title,
			content: data.note.content,
		},
	})

	return (
		<div className="absolute inset-0">
			<Form
				{...form.props}
			>
				<div className="flex flex-col gap-1">
					<div>
						<Label htmlFor="note-title">Title</Label>
						<Input
							autoFocus
							{...conform.input(fields.title)}
						/>
						<Label htmlFor={fields.title.id}>Title</Label>
						<Input autoFocus {...conform.input(fields.title)} />
						<div className="min-h-[32px] px-4 pb-3 pt-1">
							<ErrorList id={titleErrorId} errors={fieldErrors?.title} />
							<ErrorList
								id={fields.title.errorId}
								errors={fields.title.errors}
							/>
						</div>
					</div>
					<div>
						<Label htmlFor={fields.content.id}>Content</Label>
						<Textarea
							{...conform.input(fields.content)}
						/>
						<Label htmlFor={fields.content.id}>Content</Label>
						<Textarea {...conform.textarea(fields.content)} />
						<div className="min-h-[32px] px-4 pb-3 pt-1">
							<ErrorList id={contentErrorId} errors={fieldErrors?.content} />
							<ErrorList
								id={fields.content.errorId}
								errors={fields.content.errors}
							/>
						</div>
					</div>
				</div>
				<ErrorList id={formErrorId} errors={formErrors} />
				<ErrorList id={form.errorId} errors={form.errors} />
			</Form>
			<div className={floatingToolbarClassName}>
				<Button form={formId} variant="destructive" type="reset">
				<Button form={form.id} variant="destructive" type="reset">
					Reset
				</Button>
				<StatusButton
					form={formId}
					form={form.id}
					type="submit"
					disabled={isSubmitting}
					status={isSubmitting ? 'pending' : 'idle'}
					>
						Submit
				</StatusButton>
			</div>
		</div>
	)
}
```

## File Upload

### Multi-part Form Data

```html
<form action="/upload" method="post" enctype="multipart/form-data">
	<label for="file-upload-input">Upload File</label>
	<input type="file" id="file-upload-input" name="file-upload" />
	<button type="submit">Upload File</button>
</form>
```

For multiple files:

```html
<form action="/upload" method="post" enctype="multipart/form-data">
	<input type="file" id="file-upload" name="file-upload" multiple />
	<input type="submit" value="Upload File" />
</form>
```

This returns a `FileList` object:

```js
let fileList = document.getElementById('file-upload').files
```

Each `File` object within the `FileList` contains properties such
as `name`, `size`, `type`, which represents the MIME type, and `lastModified`.
These files can then be read and manipulated using the `FileReader` API. To only
accept image files:

```html
<input type="file" id="file-upload" name="file-upload" accept="image/*" />
```

On the server end [[Remix]] handles files set from the browser with these three
utilities:

[**`parseMultipartFormData`**](https://remix.run/docs/en/main/utils/parse-multipart-form-data):
This is the utility that allows you to turn the stream of data and turn it into
a `FormData` object. This is the same object you get from `request.formData()`,
but the bit that represents the file will depend on the "uploadHandler" you use.

[**`createFileUploadHandler`**](https://remix.run/docs/en/main/utils/unstable-create-file-upload-handler):
This is a "uploadHandler" which will stream the file to disk and give back a
path to that file with some other meta data.

[**`createMemoryUploadHandler`**](https://remix.run/docs/en/main/utils/unstable-create-memory-upload-handler):
This is a "uploadHandler" which will store the file in memory and give back a
web
standard [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) object.
For small files. Use the `maxPartSize` option to limit the size of files it will
load into memory.

```js
import {
	createMemoryUploadHandler,
	parseMultipartFormData,
} from "@remix-run/node";

export const action = async ({ request }: ActionArgs) => {
	const uploadHandler = createMemoryUploadHandler({
		maxPartSize: 1024 * 1024 * 5, // 5 MB
	});
	const formData = await parseMultipartFormData(request, uploadHandler);

	const file = formData.get("avatar");
};
```

For file validation with Zod:

```ts
const NoteEditorSchema = z.object({
	title: z.string().max(titleMaxLength),
	content: z.string().max(contentMaxLength),
	imageId: z.string().optional(),
	file: z
		.instanceof(File)
		.refine(file => {
			return file.size <= MAX_UPLOAD_SIZE
		}, 'File size must be less than 3MB')
		.optional(),
	altText: z.string().optional(),
})
```

## Complex File Structures

If we want an array of inputs we can name them all the same:

```html
<form>
	<input type="text" name="todo" value="Buy milk" />
	<input type="text" name="todo" value="Buy eggs" />
	<input type="text" name="todo" value="Wash dishes" />
</form>
```

And get this:

```js
const formData = new FormData(form)
formData.getAll('todo') // ["Buy milk", "Buy eggs", "Wash dishes"]
```

With Conform we can do this using `useFieldset` for nested objects and
`useFieldList` for arrays:

```tsx
// example inspired from the Conform docs
import {
	useForm,
	useFieldset,
	conform,
	type FieldConfig,
} from '@conform-to/react'

function Example() {
	const data = useLoaderData()
	const actionData = useActionData()
	const [form, fields] = useForm({
		id: 'personal-data',
		constraint: getFieldsetConstraint(PersonalDataSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: PersonalDataSchema })
		},
		defaultValue: {
			name: data.user.name,
			dateOfBirth: data.user.dateOfBirth,
			address: data.user.address,
			phoneNumbers: data.user.phoneNumbers
		},
	})

	// for arrays
	const phoneNumbersList = useFieldsList(form.ref, fields.phoneNumbers)

	return (
		<form {...form.props}>
			<input {...conform.input(fields.name)} />
			<input {...conform.input(fields.dateOfBirth)} />
			<ul>
			{phoneNumbersList.map(number => {
				return (
					<li>
						<input {...conform.input(number)}>
						<button {...list.remove(fields.titles.name, { index })}> Remove Phone Number</button>
					</li>
				)}
				)}
			<button {...list.insert(fields.titles.name, { defaultValue: '' })}> Add Phone Number</button>
			</ul>
			<AddressFields config={fields.address} />
		</form>
	)
}

function AddressFields({ config }: { config: FieldConfig<Address> }) {
	const ref = useRef<HTMLFieldSetElement>(null)
	const fields = useFieldset(ref, config)
	return (
		<fieldset ref={ref}>
			<input {...conform.input(fields.street)} />
			<input {...conform.input(fields.zipcode)} />
			<input {...conform.input(fields.city)} />
			<input {...conform.input(fields.country)} />
		</fieldset>
	)
}
```

Since adding and removing items from the form will submit `POST` request when
javascript isn't loaded on the page, we add this to our backend:

```ts
if (submission.intent !== 'submit') {
	return json({ status: 'idle', submission } as const)
}
```

Conform will handle this case server-side and modify the `submission` object to
reflex changes to the form like adding and removing fields.

## Honeypot

A hidden field added to form to detect bots.

```html
<form>
	<div style="display: none;">
		<label>
			Do not fill out this field
			<input type="text" name="name__confirm" />
		</label>
	</div>
	<button type="submit">Send</button>
</form>
```

With Remix Utils we do this:

```js
// create the honeypot instance and configure it:
const honeypot = new Honeypot({
	validFromFieldName: process.env.TESTING ? null : '',
	encryptionSeed: process.env.HONEYPOT_SECRET,
})

// get the props for our fields:
const honeyProps = honeypot.getInputProps()

// pass those to the React provider
<HoneypotProvider {...honeyProps}>
	<App />
</HoneypotProvider>

// render the fields within our form
<HoneypotInputs />

// check the honeypot field on the server
try {
		honeypot.check(formData)
	} catch (error) {
		if (error instanceof SpamError) {
			throw new Response('Invalid form submission', { status: 400 })
		}
		throw error
	}
```

We add our own encryption seed in case our form is not being abled by the same
server that generated it, when we distrubute our app.

## CSRF

For CSRF we create a cookie using Remix and then use Remix Utils:

```js
import { createCookie } from '@remix-run/node'
import { CSRF } from 'remix-utils/csrf/server'

const cookie = createCookie('csrf', {
	path: '/',
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'lax',
	secrets: process.env.SESSION_SECRET.split(','),
})

export const csrf = new new CSRF({ cookie })()
```

We import that `csrf` to the root of out app and send it to the client, with the
cookie in the header:

```js
export async function loader() {
	return json({
		username: os.userInfo().username,
		ENV: getEnv(),
	})
	const [csrfToken, csrfCookieHeader] = await csrf.commitToken()
	return json(
		{ username: os.userInfo().username, ENV: getEnv(), csrfToken },
		{
			headers: csrfCookieHeader ? { 'set-cookie': csrfCookieHeader } : {},
		},
	)
```

We also wrap out app in a provider so we can add the
`<AuthenticityTokenInput />` to all our forms:

```tsx
export default function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	return (
		<AuthenticityTokenProvider token={data.csrfToken}>
			<App />
		</AuthenticityTokenProvider>
	)
}
```

## Rate Limiting

We create 3 tiers of rate limits:

- `defaultRateLimit` for all of our `GET` request, which has the least
  restrictive setting.
- `strongRateLimit` for `POST` requests.
- `strongestRateLimit` for `POST` requests that come from login attempts or
  other sensitive forms that might be targets of brute force attacks.

```ts
// place the rate limiter right before we start doing the more intensive Remix serving.
const maxMultiple = process.env.TESTING ? 10_000 : 1

const defaultRateLimit = {
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 1000 * maxMultiple, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Use standard draft-6 headers of `RateLimit-Policy` `RateLimit-Limit`, and `RateLimit-Remaining`
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	// store: ... , // Use an external store for more precise rate limiting
}
const generalRateLimit = rateLimit({
	...defaultRateLimit,
})
const strongRateLimit = rateLimit({
	...defaultRateLimit,
	limit: 100 * maxMultiple,
})
const strongestRateLimit = rateLimit({
	limit: 10 * maxMultiple,
})

app.use((req, res, next) => {
	const strongPaths = ['/signup']
	if (req.method !== 'GET' && req.method !== 'HEAD') {
		if (strongPaths.some(path => req.path.includes(path))) {
			return strongestRateLimit(req, res, next)
		}
		return strongRateLimit(req, res, next)
	}
	return generalRateLimit(req, res, next)
})
```

![Professional Web Forms Certificate](https://www.epicweb.dev/api/certificate?moduleId=9abe3ebc-46e9-4b9e-a7b0-347c83f83941&userId=c37b5fcf-6d84-4015-a924-fc1a7bbdd7a2)
