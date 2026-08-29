import type { ActivityAction } from "@prisma/client"
import { FileUp, FileX2, History, TrendingUp, UserPlus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState, PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateTime, formatDayTime } from "@/lib/format"
import { requireUser } from "@/server/auth/guards"
import { listRecentActivity } from "@/server/services/activity-service"

export const metadata: Metadata = { title: "Aktivitas Terkini" }

const ACTION_ICONS: Partial<Record<ActivityAction, typeof History>> = {
  PROGRESS_UPDATED: TrendingUp,
  DOCUMENT_UPLOADED: FileUp,
  DOCUMENT_DELETED: FileX2,
  MEMBER_ASSIGNED: UserPlus,
}

export default async function ActivityPage() {
  const user = await requireUser()
  const items = await listRecentActivity({ id: user.id, role: user.role }, 60)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aktivitas Terkini"
        description="Riwayat pembaruan progress dan dokumen di seluruh proyek."
      />

      <Card className="py-0">
        <CardContent className="px-0">
          {items.length === 0 ? (
            <EmptyState
              icon={History}
              title="Belum ada aktivitas"
              description="Perubahan progress dan unggahan dokumen akan tercatat di sini."
            />
          ) : (
            <ol className="divide-y">
              {items.map((item) => {
                const Icon = ACTION_ICONS[item.action] ?? History

                return (
                  <li key={item.id} className="flex gap-3.5 px-4 py-4 sm:px-5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-navy/8 text-brand-navy">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-relaxed">
                        <span className="font-semibold text-foreground">{item.actor.name}</span>{" "}
                        <span className="text-muted-foreground">{item.summary}</span>
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {item.project ? (
                          <Link
                            href={`/projects/${item.project.id}`}
                            className="font-medium text-brand-navy hover:text-brand-maroon hover:underline"
                          >
                            {item.project.name}
                          </Link>
                        ) : null}
                        <time
                          dateTime={new Date(item.createdAt).toISOString()}
                          title={formatDateTime(item.createdAt)}
                          className="tabular-nums"
                        >
                          {formatDayTime(item.createdAt)}
                        </time>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
