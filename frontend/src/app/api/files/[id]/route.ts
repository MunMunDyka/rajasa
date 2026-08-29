import { requireUser } from "@/server/auth/guards"
import { getDocumentForViewer } from "@/server/services/document-service"
import { fileExists, readFileStream } from "@/server/storage"

/**
 * Streams an uploaded file.
 *
 * Files live outside the web root and their names on disk are generated uuids,
 * so this route is the only way to reach them - which means the access check
 * here is the access check, not a second line of defence.
 *
 * The lookup is scoped to the viewer, so an Engineer requesting another
 * project's document gets the same 404 as one requesting a document that does
 * not exist. Distinguishing the two would confirm which ids are real.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let user
  try {
    user = await requireUser()
  } catch {
    return new Response("Unauthorized", { status: 401 })
  }

  const document = await getDocumentForViewer(
    { id: user.id, role: user.role },
    id
  )

  if (!document) {
    return new Response("Not found", { status: 404 })
  }

  if (!(await fileExists(document.storageKey))) {
    // The row exists but the bytes do not - a seed run against a wiped uploads
    // directory, or a restore that missed the files.
    return new Response("File tidak ditemukan di penyimpanan.", { status: 410 })
  }

  const stream = readFileStream(document.storageKey)

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Length": String(document.sizeBytes),
      // inline: PDFs and images open in the browser's viewer rather than
      // downloading. The filename still applies if the user chooses to save.
      "Content-Disposition": `inline; filename="${encodeURIComponent(document.originalName)}"`,
      // Private: this is per-user authorised content and must never be held by
      // a shared cache.
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  })
}
