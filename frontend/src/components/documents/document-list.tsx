import { CalendarDays, FolderOpen, FolderKanban, UserRound } from "lucide-react"
import Link from "next/link"

import {
  FilePreviewButton,
  FileThumbnail,
} from "@/components/documents/file-preview"
import { EmptyState } from "@/components/layout/page-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import type { DocumentListItem } from "@/server/services/document-service"

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function KindLabel({ kind }: { kind: DocumentListItem["kind"] }) {
  return (
    <span className="inline-flex rounded border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {kind === "PROGRESS_EVIDENCE" ? "Bukti progress" : "Dokumen proyek"}
    </span>
  )
}

export function DocumentList({
  documents,
  showProject = true,
  emptyTitle = "Belum ada dokumen",
  emptyDescription,
}: {
  documents: DocumentListItem[]
  showProject?: boolean
  emptyTitle?: string
  emptyDescription?: string
}) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <>
      <div className="divide-y lg:hidden">
        {documents.map((document) => (
          <article key={document.id} className="space-y-3.5 p-4">
            <div className="flex items-start gap-3">
              <FileThumbnail file={document} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug text-brand-navy">
                  {document.name}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {document.documentNumber
                    ? `${document.documentNumber} / `
                    : ""}
                  {formatBytes(document.sizeBytes)}
                </p>
                <div className="mt-1.5">
                  <KindLabel kind={document.kind} />
                </div>
              </div>
              <FilePreviewButton file={document} compact className="shrink-0" />
            </div>

            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <span className="flex items-center gap-1.5">
                <FolderKanban className="size-3.5 shrink-0" />
                {showProject ? (
                  <Link
                    href={`/projects/${document.project.id}`}
                    className="truncate font-medium text-foreground hover:text-brand-maroon hover:underline"
                  >
                    {document.project.name}
                  </Link>
                ) : (
                  <span className="truncate">{document.category.label}</span>
                )}
              </span>
              <span className="flex items-center gap-1.5 sm:justify-end">
                <CalendarDays className="size-3.5" />
                {formatDate(document.documentDate ?? document.uploadedAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <UserRound className="size-3.5" />
                {document.uploadedBy.name}
              </span>
              {showProject ? (
                <span className="sm:text-right">{document.category.label}</span>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-72">Dokumen</TableHead>
              <TableHead className="min-w-36">Kategori</TableHead>
              {showProject ? <TableHead className="min-w-52">Proyek</TableHead> : null}
              <TableHead className="min-w-36">Diunggah oleh</TableHead>
              <TableHead className="min-w-28">Tanggal</TableHead>
              <TableHead className="w-28 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell>
                  <div className="flex items-start gap-3">
                    <FileThumbnail file={document} />
                    <div className="min-w-0 space-y-1">
                      <p className="max-w-sm whitespace-normal font-semibold leading-snug text-brand-navy">
                        {document.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {document.documentNumber
                          ? `${document.documentNumber} / `
                          : ""}
                        {formatBytes(document.sizeBytes)}
                      </p>
                      <KindLabel kind={document.kind} />
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-sm">{document.category.label}</TableCell>

                {showProject ? (
                  <TableCell>
                    <Link
                      href={`/projects/${document.project.id}`}
                      className="block whitespace-normal text-sm font-medium text-brand-navy hover:text-brand-maroon hover:underline"
                    >
                      {document.project.name}
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {document.project.code}
                      </span>
                    </Link>
                  </TableCell>
                ) : null}

                <TableCell className="text-sm">{document.uploadedBy.name}</TableCell>

                <TableCell className="text-sm whitespace-nowrap">
                  {formatDate(document.documentDate ?? document.uploadedAt)}
                </TableCell>

                <TableCell className="text-right">
                  <FilePreviewButton file={document} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
