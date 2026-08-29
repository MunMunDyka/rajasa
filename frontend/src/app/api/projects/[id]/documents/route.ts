import { MAX_UPLOAD_BYTES } from "@/config/app"
import { requireUser } from "@/server/auth/guards"
import {
  createProjectDocument,
  DocumentUploadError,
} from "@/server/services/document-service"

export const runtime = "nodejs"

function textField(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user
  try {
    user = await requireUser()
  } catch {
    return Response.json({ message: "Anda harus masuk terlebih dahulu." }, { status: 401 })
  }

  try {
    const { id: projectId } = await params
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ message: "Pilih file yang akan diunggah." }, { status: 400 })
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return Response.json(
        { message: `Ukuran file maksimal ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` },
        { status: 413 }
      )
    }

    const fallbackName = file.name.replace(/\.[^.]+$/, "").trim() || "Dokumen"
    const requirementId = textField(formData, "requirementId")
    const document = await createProjectDocument(
      { id: user.id, role: user.role },
      {
        projectId,
        categoryId: textField(formData, "categoryId"),
        requirementId: requirementId === "__none__" ? null : requirementId || null,
        name: textField(formData, "name") || fallbackName,
        originalName: file.name,
        mimeType: file.type,
        bytes: Buffer.from(await file.arrayBuffer()),
      }
    )

    return Response.json(
      { document, message: "Dokumen berhasil diunggah." },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof DocumentUploadError) {
      const status =
        error.code === "FORBIDDEN"
          ? 403
          : error.code === "NOT_FOUND"
            ? 404
            : error.code === "CONFLICT"
              ? 409
              : 400
      return Response.json({ message: error.message }, { status })
    }

    console.error("Document upload failed", error)
    return Response.json(
      { message: "Dokumen gagal diunggah. Coba kembali." },
      { status: 500 }
    )
  }
}
