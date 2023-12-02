import { requireUser } from '#app/utils/auth.server.ts'
import { type DataFunctionArgs, json } from '@remix-run/node'
import { action, NoteEditor } from './__note-editor.tsx'
import { invariantResponse } from '#app/utils/misc.tsx'

export async function loader({ request, params }: DataFunctionArgs) {
	const user = await requireUser(request)
	invariantResponse(user?.username === params.username, 'Forbidden', {
		status: 403,
	})
	return json({})
}
export { action }
export default NoteEditor
