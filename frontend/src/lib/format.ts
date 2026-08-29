import { formatDistanceToNowStrict, isValid } from "date-fns"
import { id as localeId } from "date-fns/locale"

/** Formatting helpers. Indonesian conventions throughout - this is an Indonesian company. */

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(value) : value
  return isValid(date) ? dateFormatter.format(date) : "—"
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(value) : value
  return isValid(date) ? dateTimeFormatter.format(date) : "—"
}

const dayMonthFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
})

/**
 * Compact stamp for the activity feed: "29 Agu 16:42".
 *
 * The year is dropped because the feed only ever shows recent entries, and the
 * time is built by hand rather than through Intl: id-ID renders 16.42 with a
 * full stop, which reads as a decimal at a glance.
 */
export function formatDayTime(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(value) : value
  if (!isValid(date)) return "—"

  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${dayMonthFormatter.format(date)} ${hours}:${minutes}`
}

/** "3 hari lalu". Used in the activity feed and the "last updated" column. */
export function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(value) : value
  if (!isValid(date)) return "—"
  return `${formatDistanceToNowStrict(date, { locale: localeId })} lalu`
}

export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"
  const numeric = typeof value === "string" ? Number(value) : value
  return Number.isFinite(numeric) ? currencyFormatter.format(numeric) : "—"
}

/**
 * Whole days from today until `target`. Negative means the date has passed.
 * Compared at midnight so "due today" is 0 rather than a fraction.
 */
export function daysUntil(target: Date | string): number {
  const date = typeof target === "string" ? new Date(target) : target
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfTarget = new Date(date)
  startOfTarget.setHours(0, 0, 0, 0)
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000)
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
