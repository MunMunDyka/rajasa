import { ArrowUpRight, CalendarDays, FolderOpen, UserRound } from "lucide-react"
import Link from "next/link"

import { EmptyState } from "@/components/layout/page-header"
import {
  DelayedBadge,
  DocumentsBadge,
  ProgressCell,
  StatusBadge,
} from "@/components/projects/project-badges"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatRelative } from "@/lib/format"
import type { ProjectListItem } from "@/server/services/project-service"

/**
 * One badge, not two.
 *
 * A row previously stacked "Berjalan" on top of "Terlambat", which doubled the
 * row height and made the column the loudest thing in the table. Being late is
 * the fact that needs acting on, so it wins; the underlying status is still on
 * the project detail page.
 */
function StatusCell({ project }: { project: ProjectListItem }) {
  return project.flags.delayed ? (
    <DelayedBadge />
  ) : (
    <StatusBadge status={project.status} />
  )
}

export function ProjectTable({
  projects,
  emptyTitle = "Belum ada proyek",
  emptyDescription,
  showLastUpdate = true,
  compact = false,
}: {
  projects: ProjectListItem[]
  emptyTitle?: string
  emptyDescription?: string
  showLastUpdate?: boolean
  compact?: boolean
}) {
  if (projects.length === 0) {
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
      <div className="divide-y md:hidden">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="group block space-y-4 p-4 transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold leading-snug text-brand-navy">
                  {project.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {project.code}
                  {project.vesselName ? ` / ${project.vesselName}` : ""}
                </p>
              </div>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-maroon" />
            </div>

            <ProgressCell value={project.currentProgress} />

            <div className="flex flex-wrap items-center gap-1.5">
              <StatusCell project={project} />
              <DocumentsBadge {...project.documents} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <span className="flex min-w-0 items-center gap-1.5">
                <UserRound className="size-3.5 shrink-0" />
                <span className="truncate">{project.pic?.name ?? "Belum ada PIC"}</span>
              </span>
              <span className="flex items-center justify-end gap-1.5">
                <CalendarDays className="size-3.5" />
                {formatDate(project.targetDate)}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          {/* No filled header band. Between the card border, a header fill,
              a header rule and a rule under every row, the table was mostly
              lines. One hairline under the header is enough; rows are separated
              by space and a hover tint instead. */}
          <TableHeader className="bg-transparent">
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-64">Proyek</TableHead>
              {!compact ? <TableHead className="min-w-36">PIC</TableHead> : null}
              <TableHead className="min-w-40">Progress</TableHead>
              {/* Target date is dropped from the compact dashboard table: a
                  delayed project already says so in the Status column, and the
                  full date is on /projects and the detail page. */}
              {!compact ? <TableHead className="min-w-28">Target</TableHead> : null}
              <TableHead className="min-w-28">Status</TableHead>
              {!compact ? <TableHead className="min-w-24">Dokumen</TableHead> : null}
              {showLastUpdate ? <TableHead className="min-w-28">Update</TableHead> : null}
              <TableHead className="w-12">
                <span className="sr-only">Buka</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow
                key={project.id}
                className="group relative border-0 hover:bg-muted/40"
              >
                <TableCell>
                  <Link
                    href={`/projects/${project.id}`}
                    className="block whitespace-normal after:absolute after:inset-0 focus-visible:outline-none"
                  >
                    <span className="font-semibold text-brand-navy group-hover:text-brand-maroon">
                      {project.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {project.code}
                      {project.vesselName ? ` / ${project.vesselName}` : ""}
                    </span>
                  </Link>
                </TableCell>
                {!compact ? (
                  <TableCell className="text-sm">
                    {project.pic?.name ?? (
                      <span className="text-muted-foreground">Belum ditentukan</span>
                    )}
                  </TableCell>
                ) : null}
                <TableCell>
                  <ProgressCell value={project.currentProgress} />
                </TableCell>
                {!compact ? (
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDate(project.targetDate)}
                  </TableCell>
                ) : null}
                <TableCell>
                  <StatusCell project={project} />
                </TableCell>
                {!compact ? (
                  <TableCell>
                    <DocumentsBadge {...project.documents} />
                  </TableCell>
                ) : null}
                {showLastUpdate ? (
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {project.lastProgressAt
                      ? formatRelative(project.lastProgressAt)
                      : "Belum ada"}
                  </TableCell>
                ) : null}
                <TableCell className="text-right">
                  <ArrowUpRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-maroon" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
