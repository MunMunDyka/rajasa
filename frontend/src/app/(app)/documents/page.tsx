import type { Metadata } from "next"

import { DocumentList } from "@/components/documents/document-list"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { requireUser } from "@/server/auth/guards"
import { listDocuments } from "@/server/services/document-service"

export const metadata: Metadata = { title: "Dokumen" }

export default async function DocumentsPage() {
  const user = await requireUser()
  const documents = await listDocuments({ id: user.id, role: user.role })

  const isEngineer = user.role === "ENGINEER"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dokumen"
        description={
          isEngineer
            ? "Dokumen pada proyek yang ditugaskan kepada Anda."
            : "Seluruh dokumen proyek dan bukti progress."
        }
      />

      <Card className="py-0">
        <CardContent className="px-0">
          <DocumentList
            documents={documents}
            emptyDescription={
              isEngineer
                ? "Dokumen pada proyek Anda akan tampil di sini."
                : "Dokumen yang diunggah akan tampil di sini."
            }
          />
        </CardContent>
      </Card>

      {documents.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Menampilkan {documents.length} dokumen.
        </p>
      ) : null}
    </div>
  )
}
