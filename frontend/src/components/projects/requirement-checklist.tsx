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
 */
export function RequirementChecklist({
  items,
  summary,
}: {
  items: RequirementItem[]
  summary: RequirementSummary
}) {
  const complete = summary.fulfilled >= summary.total && summary.total > 0

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
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
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "text-2xl leading-none font-semibold tabular-nums",
              complete ? "text-success" : "text-foreground"
            )}
          >
            {summary.fulfilled}/{summary.total}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">wajib</p>
        </div>
      </CardHeader>

      <CardContent>
        <ul className="divide-y">
          {items.map((item) => {
            const Icon =
              item.status === "FULFILLED"
                ? Check
                : item.status === "OVERDUE"
                  ? TriangleAlert
                  : Circle

            return (
              <li key={item.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                    item.status === "FULFILLED"
                      ? "bg-success/12 text-success"
                      : item.status === "OVERDUE"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-3" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    {item.label}
                    {!item.isMandatory ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        (opsional)
                      </span>
                    ) : null}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.status === "FULFILLED" && item.fulfilledBy ? (
                      <>
                        Diunggah {item.fulfilledBy.uploadedBy} ·{" "}
                        {formatDate(item.fulfilledBy.uploadedAt)}
                      </>
                    ) : item.status === "OVERDUE" ? (
                      <span className="text-destructive">
                        Melewati batas {formatDate(item.dueDate)}
                      </span>
                    ) : item.dueDate ? (
                      <>Batas {formatDate(item.dueDate)}</>
                    ) : (
                      "Belum diunggah"
                    )}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
