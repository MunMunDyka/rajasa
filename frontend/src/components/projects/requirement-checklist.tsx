import { Check, Circle, TriangleAlert } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type {
  RequirementItem,
  RequirementSummary,
} from "@/server/services/requirement-service"

/**
 * Kelengkapan Dokumen (planning section 19b).
 *
 * This is the CEO's headline request, so it sits above the document list rather
 * than inside it: the question "what is missing" is answered before the question
 * "what do we have".
 *
 * Each row is a two-column layout - label on the left, state on the right -
 * because the card spans the full width of the page and a single left-aligned
 * column left the whole right half empty. Putting the dates in a right-hand
 * column also lines them up, so the eye can scan the deadlines on their own.
 */

const STATUS_STYLES = {
  FULFILLED: {
    marker: "border-success/30 bg-success/12 text-success",
    icon: Check,
  },
  OVERDUE: {
    marker: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: TriangleAlert,
  },
  OUTSTANDING: {
    marker: "border-border bg-muted text-muted-foreground",
    icon: Circle,
  },
} as const

function RequirementMeta({ item }: { item: RequirementItem }) {
  if (item.status === "FULFILLED" && item.fulfilledBy) {
    return (
      <div className="text-right">
        <p className="text-xs font-medium text-success">Lengkap</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {item.fulfilledBy.uploadedBy} · {formatDate(item.fulfilledBy.uploadedAt)}
        </p>
      </div>
    )
  }

  if (item.status === "OVERDUE") {
    return (
      <div className="text-right">
        <p className="text-xs font-medium text-destructive">Lewat batas</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDate(item.dueDate)}
        </p>
      </div>
    )
  }

  return (
    <div className="text-right">
      <p className="text-xs font-medium text-muted-foreground">Belum diunggah</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {item.dueDate ? `Batas ${formatDate(item.dueDate)}` : "Tanpa batas waktu"}
      </p>
    </div>
  )
}

export function RequirementChecklist({
  items,
  summary,
}: {
  items: RequirementItem[]
  summary: RequirementSummary
}) {
  const complete = summary.fulfilled >= summary.total && summary.total > 0
  const percent =
    summary.total === 0
      ? 0
      : Math.round((summary.fulfilled / summary.total) * 100)

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">Kelengkapan Dokumen</CardTitle>
            <p className="text-sm text-muted-foreground">
              {summary.total === 0
                ? "Belum ada daftar dokumen wajib."
                : complete
                  ? "Seluruh dokumen wajib sudah lengkap."
                  : `${summary.total - summary.fulfilled} dokumen wajib belum diunggah.`}
            </p>
          </div>

          <div className="flex items-end gap-3">
            <div className="text-right">
              <p
                className={cn(
                  "text-2xl leading-none font-semibold tabular-nums",
                  complete ? "text-success" : "text-brand-navy"
                )}
              >
                {summary.fulfilled}/{summary.total}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">dokumen wajib</p>
            </div>
          </div>
        </div>

        {summary.total > 0 ? (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                complete ? "bg-success" : "bg-brand-navy"
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        ) : null}
      </CardHeader>

      <CardContent>
        <ul className="divide-y">
          {items.map((item) => {
            const style = STATUS_STYLES[item.status]
            const Icon = style.icon

            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border",
                      style.marker
                    )}
                  >
                    <Icon className="size-3" />
                  </span>

                  <p
                    className={cn(
                      "min-w-0 text-sm leading-snug",
                      item.status === "FULFILLED" && "text-muted-foreground"
                    )}
                  >
                    {item.label}
                    {!item.isMandatory ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        opsional
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="shrink-0">
                  <RequirementMeta item={item} />
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
