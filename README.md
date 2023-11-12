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

```js
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
