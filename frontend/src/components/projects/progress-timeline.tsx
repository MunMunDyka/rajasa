import { History } from "lucide-react"

import { FilePreviewButton } from "@/components/documents/file-preview"
import { EmptyState } from "@/components/layout/page-header"
import { formatDate } from "@/lib/format"
import type { ProgressEntry } from "@/server/services/progress-service"

/**
 * Chronological progress history (planning section 17).
 *
 * Newest first, each entry showing the delta rather than only the new number -
 * "50% to 65%" tells you the size of the step, "65%" does not.
 */
export function ProgressTimeline({ entries }: { entries: ProgressEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Belum ada pembaruan progress"
        description="Pembaruan yang dikirim engineer yang ditugaskan akan tampil di sini."
      />
    )
  }

  return (
    <ol className="relative space-y-6 pl-6">
      {/* Spine. Stops short of the last marker so it does not dangle. */}
      <span
        aria-hidden
        className="absolute top-2 bottom-2 left-[5px] w-px bg-border"
      />

      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            aria-hidden
            className="absolute top-1.5 -left-6 size-2.5 rounded-full border-2 border-card bg-brand-navy"
          />

          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-sm font-semibold tabular-nums">
              {entry.previousProgress}%
              <span className="mx-1 font-normal text-muted-foreground">→</span>
              {entry.progress}%
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(entry.reportedAt)} · {entry.author.name}
            </span>
          </div>

          <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
            {entry.description}
          </p>

          {entry.evidence.length > 0 ? (
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {entry.evidence.map((file) => (
                <li key={file.id}>
                  <FilePreviewButton file={file} compact label={file.name} />
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
