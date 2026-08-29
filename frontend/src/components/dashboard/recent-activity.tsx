import type { ActivityAction } from "@prisma/client"
import { FileUp, FileX2, History, TrendingUp, UserPlus } from "lucide-react"
import Link from "next/link"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRelative, initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ActivityItem } from "@/server/services/activity-service"

/** Recent activity feed (planning section 23). */

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
  return (
    <Card className="h-full">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <History className="size-4 text-brand-navy" />
          <CardTitle>Aktivitas Terkini</CardTitle>
        </div>
        <CardDescription>
          Pembaruan progress dan dokumen terbaru di seluruh proyek.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="rounded-full bg-muted p-2.5">
              <History className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Belum ada aktivitas.</p>
            <p className="text-xs text-muted-foreground">
              Pembaruan progress dan unggahan dokumen akan tampil di sini.
            </p>
          </div>
        ) : (
          <ol className="divide-y">
            {items.map((item) => {
              const Icon = ACTION_ICONS[item.action] ?? History
              return (
                <li key={item.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div className="flex flex-col items-center">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-brand-navy/9 text-[10px] font-semibold text-brand-navy">
                        {initials(item.actor.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm leading-snug">
                      <span className="font-medium">{item.actor.name}</span>{" "}
                      <span className="text-muted-foreground">{item.summary}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <ProgressDelta metadata={item.metadata} />
                      {item.project ? (
                        <Link
                          href={`/projects/${item.project.id}`}
                          className={cn(
                            "inline-flex items-center gap-1 text-xs text-muted-foreground",
                            "hover:text-foreground hover:underline"
                          )}
                        >
                          <Icon className="size-3" />
                          {item.project.name}
                        </Link>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {formatRelative(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
