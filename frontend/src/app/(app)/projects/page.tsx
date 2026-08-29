import type { ProjectStatus } from "@prisma/client"
import type { Metadata } from "next"
import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { ProjectFilters } from "@/components/projects/project-filters"
import { ProjectTable } from "@/components/projects/project-table"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { canManageProjects, canSeeFinancials, requireUser } from "@/server/auth/guards"
import {
  listAssignableEngineers,
  listProjects,
  suggestProjectCode,
} from "@/server/services/project-service"

export const metadata: Metadata = { title: "Proyek" }

const VALID_STATUSES: ProjectStatus[] = [
  "PLANNING",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
]

export default async function ProjectsPage({
  searchParams,
}: PageProps<"/projects">) {
  const user = await requireUser()
  const params = await searchParams

  const rawStatus = typeof params.status === "string" ? params.status : undefined
  const status = VALID_STATUSES.includes(rawStatus as ProjectStatus)
    ? (rawStatus as ProjectStatus)
    : undefined

  const search = typeof params.q === "string" ? params.q : undefined

  const mayCreate = canManageProjects(user.role)

  const [projects, suggestedCode, engineers] = await Promise.all([
    listProjects({ id: user.id, role: user.role }, { status, search }),
    mayCreate ? suggestProjectCode() : Promise.resolve(""),
    mayCreate ? listAssignableEngineers() : Promise.resolve([]),
  ])

  const isEngineer = user.role === "ENGINEER"
  const filtered = Boolean(status || search)

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEngineer ? "Proyek Saya" : "Proyek"}
        description={
          isEngineer
            ? "Proyek yang ditugaskan kepada Anda."
            : "Seluruh proyek yang terdaftar di sistem."
        }
        actions={
          mayCreate ? (
            <CreateProjectDialog
              suggestedCode={suggestedCode}
              engineers={engineers}
              canSeeFinancials={canSeeFinancials(user.role)}
            />
          ) : null
        }
      />

      <Suspense fallback={<Skeleton className="h-9 w-full max-w-xs" />}>
        <ProjectFilters />
      </Suspense>

      <Card className="py-0">
        <CardContent className="px-0">
          <ProjectTable
            projects={projects}
            emptyTitle={
              filtered ? "Tidak ada proyek yang cocok" : "Belum ada proyek"
            }
            emptyDescription={
              filtered
                ? "Coba ubah kata kunci atau filter status."
                : isEngineer
                  ? "Proyek yang ditugaskan kepada Anda akan tampil di sini."
                  : "Proyek yang dibuat akan tampil di sini."
            }
          />
        </CardContent>
      </Card>

      {projects.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Menampilkan {projects.length} proyek.
        </p>
      ) : null}
    </div>
  )
}
