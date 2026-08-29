import { CircleAlert, FileWarning, FolderKanban, Gauge } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ProjectStats } from "@/server/services/project-service"

/**
 * Dashboard counters (planning section 13).
 *
 * Four tiles, no icons, no coloured chrome. The earlier version had five tiles
 * each with a tinted icon badge, which meant five competing colours before a
 * single row of data appeared. Here only a number that demands action carries
 * colour, so the eye lands on it immediately.
 */
export function StatCards({ stats }: { stats: ProjectStats }) {
  const tiles = [
    {
      label: "Total proyek",
      value: stats.total,
      alert: false,
      icon: FolderKanban,
      iconClass: "bg-brand-navy/8 text-brand-navy",
    },
    {
      label: "Sedang berjalan",
      value: stats.inProgress,
      alert: false,
      icon: Gauge,
      iconClass: "bg-info/10 text-info",
    },
    {
      label: "Perlu perhatian",
      value: stats.needsAttention,
      alert: stats.needsAttention > 0,
      icon: CircleAlert,
      iconClass: "bg-warning/12 text-warning",
    },
    {
      label: "Dokumen belum lengkap",
      value: stats.incompleteDocuments,
      alert: stats.incompleteDocuments > 0,
      icon: FileWarning,
      iconClass: "bg-brand-maroon/9 text-brand-maroon",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon
        return (
        <Card key={tile.label} className="min-h-32 sm:min-h-28">
          <CardContent className="flex h-full items-start justify-between gap-3">
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
              <p
                className={cn(
                  "text-3xl leading-none font-semibold tabular-nums text-brand-navy",
                  tile.alert && "text-brand-maroon"
                )}
              >
                {tile.value}
              </p>
            </div>
            <span className={cn("flex size-9 items-center justify-center rounded-md", tile.iconClass)}>
              <Icon className="size-4.5" />
            </span>
          </CardContent>
        </Card>
      )})}
    </div>
  )
}
