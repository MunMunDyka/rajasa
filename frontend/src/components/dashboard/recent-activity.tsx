"use client"

import type { ActivityAction } from "@prisma/client"
import {
  ChevronLeft,
  ChevronRight,
  FileUp,
  FileX2,
  History,
  TrendingUp,
  UserPlus,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { EmptyState } from "@/components/layout/page-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDateTime, formatDayTime, initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ActivityItem } from "@/server/services/activity-service"

/**
 * Recent activity feed (planning section 23).
 *
 * Paged five at a time rather than rendering the whole list. The dashboard is a
 * glance, not an archive: five entries answer "what changed lately" without the
 * card growing taller than the project table beside it. The full history lives
 * at /activity.
 *
 * Paging is client-side over an already-fetched slice - no request per page, and
 * no spinner for something this small.
 */

const PAGE_SIZE = 5

const ACTION_ICONS: Partial<Record<ActivityAction, typeof History>> = {
  PROGRESS_UPDATED: TrendingUp,
  DOCUMENT_UPLOADED: FileUp,
  DOCUMENT_DELETED: FileX2,
  MEMBER_ASSIGNED: UserPlus,
}

function ProgressDelta({ metadata }: { metadata: ActivityItem["metadata"] }) {
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    Array.isArray(metadata) ||
    typeof metadata.from !== "number" ||
    typeof metadata.to !== "number"
  ) {
    return null
  }

  return (
    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums">
      {metadata.from}%
      <span className="text-muted-foreground">→</span>
      <span className="text-brand-navy">{metadata.to}%</span>
    </span>
  )
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  const [page, setPage] = useState(0)

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  // Clamped rather than stored blindly, so the page can never point past the end
  // if the list shrinks under it after a refresh.
  const current = Math.min(page, pageCount - 1)
  const start = current * PAGE_SIZE
  const visible = items.slice(start, start + PAGE_SIZE)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <History className="size-4 text-brand-navy" />
          <CardTitle>Aktivitas Terkini</CardTitle>
        </div>
        <CardDescription>
          Pembaruan progress dan dokumen terbaru.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {items.length === 0 ? (
          <EmptyState
            icon={History}
            title="Belum ada aktivitas"
            description="Pembaruan progress dan unggahan dokumen akan tampil di sini."
          />
        ) : (
          <ol className="divide-y">
            {visible.map((item) => {
              const Icon = ACTION_ICONS[item.action] ?? History
              return (
                <li
                  key={item.id}
                  className="flex gap-3 py-3.5 first:pt-0 last:pb-0"
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="bg-brand-navy/9 text-[10px] font-semibold text-brand-navy">
                      {initials(item.actor.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Timestamp sits on the right of the first line, not in
                        the meta row: it is the one field every entry has, so
                        keeping it in a fixed column lets the eye scan straight
                        down. shrink-0 keeps it whole and lets the sentence wrap
                        instead. break-words on the sentence because an activity
                        line cut off mid-word is useless. */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-sm leading-snug break-words">
                        <span className="font-medium">{item.actor.name}</span>{" "}
                        <span className="text-muted-foreground">
                          {item.summary}
                        </span>
                      </p>
                      <time
                        dateTime={new Date(item.createdAt).toISOString()}
                        title={formatDateTime(item.createdAt)}
                        className="shrink-0 pt-0.5 text-[11px] tabular-nums whitespace-nowrap text-muted-foreground"
                      >
                        {formatDayTime(item.createdAt)}
                      </time>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <ProgressDelta metadata={item.metadata} />
                      {item.project ? (
                        <Link
                          href={`/projects/${item.project.id}`}
                          className={cn(
                            "inline-flex min-w-0 max-w-full items-center gap-1 text-xs text-muted-foreground",
                            "hover:text-foreground hover:underline"
                          )}
                        >
                          <Icon className="size-3 shrink-0" />
                          <span className="truncate">{item.project.name}</span>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>

      {/* flex-wrap on the footer so the count drops to its own line instead of
          colliding with the buttons when the column is narrow. */}
      {items.length > PAGE_SIZE ? (
        <CardFooter className="flex-wrap justify-between gap-2 border-t pt-4">
          <span className="text-xs tabular-nums text-muted-foreground">
            {start + 1}–{start + visible.length} dari {items.length}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
              aria-label="Aktivitas sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
              aria-label="Aktivitas berikutnya"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  )
}
