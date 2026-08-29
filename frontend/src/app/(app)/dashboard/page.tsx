import type { ProjectStatus } from "@prisma/client"
import { ArrowRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { RecentActivity } from "@/components/dashboard/recent-activity"
import { StatCards } from "@/components/dashboard/stat-cards"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectFilters } from "@/components/projects/project-filters"
import { ProjectTable } from "@/components/projects/project-table"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/server/auth/guards"
import { listRecentActivity } from "@/server/services/activity-service"
import {
  DASHBOARD_PROJECT_LIMIT,
  getDashboardProjectData,
} from "@/server/services/project-service"

export const metadata: Metadata = { title: "Dashboard" }

const VALID_STATUSES: ProjectStatus[] = [
  "PLANNING",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
]

/**
 * Executive dashboard (planning sections 13 and 19b).
 *
 * Every query is scoped by role inside the services, so an Engineer loading this
 * page gets counters and a table covering only their own projects - the page
 * itself does no filtering by role.
 */
export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const user = await requireUser()
  const viewer = { id: user.id, role: user.role }
  const params = await searchParams

  const rawStatus = typeof params.status === "string" ? params.status : undefined
  const status = VALID_STATUSES.includes(rawStatus as ProjectStatus)
    ? (rawStatus as ProjectStatus)
    : undefined
  const search = typeof params.q === "string" ? params.q : undefined

  const [projectData, activity] = await Promise.all([
    getDashboardProjectData(viewer, { status, search }),
    // 20 rows so the five-per-page card has something to page through.
    listRecentActivity(viewer, 20),
  ])
  const { stats, projects, matchCount, filtered } = projectData

  const isEngineer = user.role === "ENGINEER"
  const hidden = matchCount - projects.length

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.role === "CEO" ? "Dashboard Eksekutif" : "Dashboard"}
        description={
          isEngineer
            ? `Ringkasan proyek yang ditugaskan kepada Anda, ${user.name}.`
            : `Ringkasan kondisi seluruh proyek, ${user.name}.`
        }
      />

      <StatCards stats={stats} />

      {/* Splits at lg (1024px), not xl (1280px). A laptop at 125-130% browser
          zoom lands just under 1280 effective pixels and would otherwise get a
          single stacked column on what is clearly a wide screen. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <Card className="flex h-full flex-col">
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Ringkasan Proyek</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/projects">
                  Semua proyek
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            {/* Filters write to the URL, so a filtered dashboard can be shared
                and survives a refresh. Suspense because the component reads
                useSearchParams. */}
            <Suspense fallback={<Skeleton className="h-9 w-full max-w-xs" />}>
              <ProjectFilters />
            </Suspense>
          </CardHeader>

          <CardContent className="flex-1 px-0">
            <ProjectTable
              projects={projects}
              showLastUpdate={false}
              compact
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

          {hidden > 0 ? (
            <CardFooter className="justify-between gap-2 border-t pt-4">
              <span className="text-xs text-muted-foreground">
                Menampilkan {DASHBOARD_PROJECT_LIMIT} dari {matchCount} proyek
              </span>
              <Button asChild variant="ghost" size="sm" className="h-7">
                <Link href="/projects">Lihat {hidden} lainnya</Link>
              </Button>
            </CardFooter>
          ) : null}
        </Card>

        <RecentActivity items={activity} />
      </div>
    </div>
  )
}
