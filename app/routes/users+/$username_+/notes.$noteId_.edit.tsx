import { json, type DataFunctionArgs, redirect } from '@remix-run/node'
import { useLoaderData, Form } from '@remix-run/react'
import { db } from '#utils/db.server.ts'
import { invariantResponse } from '#utils/misc.tsx'
import { Button, Label, Input, Textarea } from '#app/components/ui/index.tsx'
import { floatingToolbarClassName } from '#app/components/floating-toolbar.tsx'

export async function loader({ params }: DataFunctionArgs) {
	const note = db.note.findFirst({
		where: {
			id: {
				equals: params.noteId,
			},
		},
	})

	invariantResponse(note, 'Note not found', { status: 404 })

	return json({
		note: { title: note.title, content: note.content },
	})
}

export async function action({ request, params }: DataFunctionArgs) {
	const formData = await request.formData()
	const title = formData.get('title')
	const content = formData.get('content')
	db.note.update({
		where: { id: { equals: params.noteId } },
		// @ts-expect-error
		data: { title, content },
	})
	return redirect(`/users/${params.username}/notes/${params.noteId}`)
}

export default function NoteEdit() {
	const data = useLoaderData<typeof loader>()
	return (
		<Form
			method="POST"
			className="flex h-full flex-col gap-y-4 overflow-x-hidden px-10 pb-28 pt-12"
		>
			<div className="flex flex-col gap-1">
				<div>
					<Label>Title</Label>
					<Input name="title" defaultValue={data.note.title} />
				</div>
				<div>
					<Label>Content</Label>
					<Textarea name="content" defaultValue={data.note.content} />
				</div>
			</div>
			<div className={floatingToolbarClassName}>
				<Button type="submit">Submit</Button>
				<Button type="reset">Reset</Button>
			</div>
		</Form>
	)
}
