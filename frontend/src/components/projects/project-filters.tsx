"use client"

import { Search, X } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Search and status filter.
 *
 * State lives in the URL rather than in React state, so a filtered view can be
 * shared, bookmarked and survives a refresh - and the server component does the
 * filtering, which keeps one implementation instead of two.
 */

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua status" },
  { value: "PLANNING", label: "Perencanaan" },
  { value: "IN_PROGRESS", label: "Berjalan" },
  { value: "ON_HOLD", label: "Ditahan" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
]

export function ProjectFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentSearch = searchParams.get("q") ?? ""
  const currentStatus = searchParams.get("status") ?? "ALL"

  function apply(next: { q?: string; status?: string }) {
    const params = new URLSearchParams(searchParams.toString())

    if (next.q !== undefined) {
      if (next.q.trim()) params.set("q", next.q.trim())
      else params.delete("q")
    }

    if (next.status !== undefined) {
      if (next.status && next.status !== "ALL") params.set("status", next.status)
      else params.delete("status")
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  const hasFilters = currentSearch !== "" || currentStatus !== "ALL"

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <form
        className="relative flex-1 sm:max-w-xs"
        onSubmit={(event) => {
          event.preventDefault()
          const value = new FormData(event.currentTarget).get("q")
          apply({ q: typeof value === "string" ? value : "" })
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        {/* Uncontrolled, with the URL value as the key. Typing needs no React
            state at all, and when the URL changes from elsewhere - the Reset
            button, the browser back button - the key changes and the input
            remounts with the new value. Mirroring the URL into state with an
            effect would do the same thing with an extra render and a lint
            error. */}
        <Input
          key={currentSearch}
          name="q"
          defaultValue={currentSearch}
          placeholder="Cari nama, kode, kapal..."
          className="pl-9"
          aria-label="Cari proyek"
        />
      </form>

      <Select
        value={currentStatus}
        onValueChange={(value) => apply({ status: value })}
      >
        <SelectTrigger className="sm:w-44" aria-label="Filter status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => router.replace(pathname))}
        >
          <X className="size-4" />
          Reset
        </Button>
      ) : null}
    </div>
  )
}
