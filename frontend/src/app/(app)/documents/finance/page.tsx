import type { Metadata } from "next"

import { DocumentList } from "@/components/documents/document-list"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { requireUser } from "@/server/auth/guards"
import { listDocuments } from "@/server/services/document-service"

export const metadata: Metadata = { title: "Dokumen Keuangan" }

/**
 * Finance is a filtered view of the same document system, not a separate one
 * (planning section 22). No general ledger, no accounting engine.
 */
export default async function FinanceDocumentsPage() {
  const user = await requireUser()
  const documents = await listDocuments(
    { id: user.id, role: user.role },
    { group: "FINANCE" }
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dokumen Keuangan"
        description="Invoice, purchase order, bukti pembayaran, dan laporan keuangan proyek."
      />

      <Card className="py-0">
        <CardContent className="px-0">
          <DocumentList
            documents={documents}
            emptyTitle="Belum ada dokumen keuangan"
            emptyDescription="Invoice, PO, dan bukti pembayaran yang diunggah akan tampil di sini."
          />
        </CardContent>
      </Card>

      {documents.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Menampilkan {documents.length} dokumen keuangan.
        </p>
      ) : null}
    </div>
  )
}
