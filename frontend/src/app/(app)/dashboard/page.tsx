import { ArrowRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AttentionList } from "@/components/dashboard/attention-list"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { StatCards } from "@/components/dashboard/stat-cards"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectTable } from "@/components/projects/project-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireUser } from "@/server/auth/guards"
import { listRecentActivity } from "@/server/services/activity-service"
import { getDashboardProjectData } from "@/server/services/project-service"

export const metadata: Metadata = { title: "Dashboard" }

/**
 * Executive dashboard (planning sections 13 and 19b).
 *
 * Every query is scoped by role inside the services, so an Engineer loading this
 * page gets counters and tables covering only their own projects - the page
 * itself does no filtering.
 */
export default async function DashboardPage() {
  const user = await requireUser()
  const viewer = { id: user.id, role: user.role }

  const [projectData, activity] = await Promise.all([
    getDashboardProjectData(viewer),
    // 20 rows so the five-per-page card has something to page through.
    listRecentActivity(viewer, 20),
  ])
  const { stats, projects, attention } = projectData

  const isEngineer = user.role === "ENGINEER"

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

      {/* Project summary on the left, activity and attention stacked on the
          right. Keeps the page to two visual rows instead of three. */}
      {/* Splits at lg (1024px), not xl (1280px). A laptop at 125-130% browser
          zoom lands just under 1280 effective pixels and would otherwise get a
          single stacked column on what is clearly a wide screen. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)]">
        <Card className="flex h-full flex-col">
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Ringkasan Proyek</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/projects">
                Semua proyek
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 px-0">
            <ProjectTable
              projects={projects}
              showLastUpdate={false}
              compact
              emptyDescription={
                isEngineer
                  ? "Proyek yang ditugaskan kepada Anda akan tampil di sini."
                  : "Proyek yang dibuat akan tampil di sini."
              }
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <RecentActivity items={activity} />
          <AttentionList projects={attention} />
        </div>
      </div>
    </div>
  )
}
