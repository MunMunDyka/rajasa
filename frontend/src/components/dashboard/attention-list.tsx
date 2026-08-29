import { CheckCircle2, ChevronRight, CircleAlert } from "lucide-react"
import Link from "next/link"

import { EmptyState } from "@/components/layout/page-header"
import {
  DelayedBadge,
  DocumentsBadge,
  DueSoonBadge,
  ProgressCell,
  StaleBadge,
} from "@/components/projects/project-badges"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { daysUntil } from "@/lib/format"
import type { AttentionItem } from "@/server/services/project-service"

/** Projects requiring attention (planning section 13). */
export function AttentionList({ projects }: { projects: AttentionItem[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <CircleAlert className="size-4 text-brand-maroon" />
          <CardTitle>Perlu Perhatian</CardTitle>
        </div>
        <CardDescription>Proyek dengan tenggat atau dokumen bermasalah.</CardDescription>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Semua proyek dalam kondisi baik"
            description="Tidak ada proyek yang terlambat atau mendekati tenggat."
          />
        ) : (
          <ul className="divide-y">
            {projects.map((project) => (
              <li key={project.id} className="py-3.5 first:pt-0 last:pb-0">
                <Link
                  href={`/projects/${project.id}`}
                  className="group block space-y-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:underline">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.code}
                        {project.pic ? ` · ${project.pic.name}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-maroon" />
                  </div>

                  <ProgressCell value={project.currentProgress} />

                  <div className="flex flex-wrap items-center gap-1.5">
                    {project.reasons.includes("DELAYED") ? <DelayedBadge /> : null}
                    {project.reasons.includes("DUE_SOON") ? (
                      <DueSoonBadge days={daysUntil(project.targetDate)} />
                    ) : null}
                    {project.reasons.includes("STALE") ? <StaleBadge /> : null}
                    {project.reasons.includes("DOCUMENTS") ? (
                      <DocumentsBadge {...project.documents} />
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
