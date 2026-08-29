import type { ProjectStatus } from "@prisma/client"

import { cn } from "@/lib/utils"

/**
 * Shared status vocabulary.
 *
 * Design note: badges are neutral chips with a single coloured dot, not filled
 * colour pills. A project row can carry a status, a delay flag and a document
 * count at once; three saturated pills side by side turn a table into a
 * fruit salad and nothing reads as important any more. The dot carries the
 * meaning, the chip stays quiet.
 */

const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Perencanaan",
  IN_PROGRESS: "Berjalan",
  ON_HOLD: "Ditahan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
}

const STATUS_DOTS: Record<ProjectStatus, string> = {
  PLANNING: "bg-muted-foreground/50",
  IN_PROGRESS: "bg-brand-navy",
  ON_HOLD: "bg-warning",
  COMPLETED: "bg-success",
  CANCELLED: "bg-muted-foreground/30",
}

function Chip({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-0.5",
        "text-xs font-medium whitespace-nowrap text-foreground/80",
        className
      )}
    >
      {children}
    </span>
  )
}

function Dot({ className }: { className?: string }) {
  return <span className={cn("size-1.5 shrink-0 rounded-full", className)} />
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Chip>
      <Dot className={STATUS_DOTS[status]} />
      {STATUS_LABELS[status]}
    </Chip>
  )
}

/** Derived, not a status. Always shown alongside the real status, never instead. */
export function DelayedBadge() {
  return (
    <Chip className="border-destructive/25 text-destructive">
      <Dot className="bg-destructive" />
      Terlambat
    </Chip>
  )
}

export function DueSoonBadge({ days }: { days: number }) {
  return (
    <Chip className="text-muted-foreground">
      <Dot className="bg-warning" />
      {days <= 0 ? "Jatuh tempo" : `${days} hari lagi`}
    </Chip>
  )
}

export function StaleBadge() {
  return (
    <Chip className="text-muted-foreground">
      <Dot className="bg-muted-foreground/40" />
      Tanpa update
    </Chip>
  )
}

/**
 * Document completeness, e.g. 5/6 (planning section 19b).
 * Only the incomplete-and-overdue case gets colour; complete is quiet on purpose,
 * since "nothing to do here" should not compete for attention.
 */
export function DocumentsBadge({
  fulfilled,
  total,
  overdue,
}: {
  fulfilled: number
  total: number
  overdue: number
}) {
  if (total === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const complete = fulfilled >= total

  return (
    <Chip
      className={cn(
        "tabular-nums",
        !complete && overdue > 0 && "border-destructive/25 text-destructive"
      )}
    >
      <Dot
        className={
          complete
            ? "bg-success"
            : overdue > 0
              ? "bg-destructive"
              : "bg-warning"
        }
      />
      {fulfilled}/{total}
    </Chip>
  )
}

/** Slim progress bar with the number beside it. */
export function ProgressCell({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            clamped >= 100 ? "bg-success" : "bg-brand-navy"
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
        {clamped}%
      </span>
    </div>
  )
}
