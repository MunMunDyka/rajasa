import type { Metadata } from "next"
import { Suspense } from "react"

import {
  DocumentFilters,
  DocumentPagination,
} from "@/components/documents/document-filters"
import { DocumentList } from "@/components/documents/document-list"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/server/auth/guards"
import {
  DEFAULT_DOCUMENT_PAGE_SIZE,
  DOCUMENT_PAGE_SIZES,
  listCategories,
  listDocumentsPage,
  listFilterableProjects,
} from "@/server/services/document-service"

export const metadata: Metadata = { title: "Dokumen" }

function parsePositiveInt(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export default async function DocumentsPage({
  searchParams,
}: PageProps<"/documents">) {
  const user = await requireUser()
  const viewer = { id: user.id, role: user.role }
  const params = await searchParams

  const categoryKey = typeof params.category === "string" ? params.category : undefined
  const projectId = typeof params.project === "string" ? params.project : undefined
  const search = typeof params.q === "string" ? params.q : undefined

  const [result, categories, projects] = await Promise.all([
    listDocumentsPage(
      viewer,
      { categoryKey, projectId, search },
      {
        page: parsePositiveInt(params.page),
        pageSize: parsePositiveInt(params.size),
      }
    ),
    listCategories(),
    listFilterableProjects(viewer),
  ])

  const isEngineer = user.role === "ENGINEER"
  const filtered = Boolean(categoryKey || projectId || search?.trim())

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dokumen"
        description={
          isEngineer
            ? "Dokumen pada proyek yang ditugaskan kepada Anda."
            : "Seluruh dokumen proyek dan bukti progress."
        }
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          {/* Suspense because the filters read useSearchParams. */}
          <Suspense fallback={<Skeleton className="h-9 w-full max-w-md" />}>
            <DocumentFilters
              categories={categories.map((category) => ({
                value: category.key,
                label: category.label,
              }))}
              projects={projects.map((project) => ({
                value: project.id,
                label: `${project.name} · ${project.code}`,
              }))}
              pageSizes={DOCUMENT_PAGE_SIZES}
              defaultPageSize={DEFAULT_DOCUMENT_PAGE_SIZE}
            />
          </Suspense>
        </CardHeader>

        <CardContent className="px-0">
          <DocumentList
            documents={result.items}
            emptyTitle={
              filtered ? "Tidak ada dokumen yang cocok" : "Belum ada dokumen"
            }
            emptyDescription={
              filtered
                ? "Coba ubah kata kunci, kategori, atau proyek."
                : isEngineer
                  ? "Dokumen pada proyek Anda akan tampil di sini."
                  : "Dokumen yang diunggah akan tampil di sini."
            }
          />
        </CardContent>

        {result.total > 0 ? (
          <CardFooter className="border-t py-4">
            <Suspense fallback={<Skeleton className="h-8 w-full" />}>
              <DocumentPagination
                page={result.page}
                pageCount={result.pageCount}
                total={result.total}
                pageSize={result.pageSize}
                shown={result.items.length}
              />
            </Suspense>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  )
}
