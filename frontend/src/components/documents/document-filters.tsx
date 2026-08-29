"use client"

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react"
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
 * Filters and paging for the documents table.
 *
 * All state lives in the URL, so a filtered view can be shared and survives a
 * refresh, and the filtering itself happens in one place on the server rather
 * than being duplicated on the client.
 *
 * Every filter change resets to page 1. Staying on page 3 after narrowing the
 * result set to four rows is how paginators end up showing an empty table.
 */

const ALL = "__all__"

export type FilterOption = { value: string; label: string }

function useUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function apply(patch: Record<string, string | undefined>, keepPage = false) {
    const params = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === ALL) params.delete(key)
      else params.set(key, value)
    }

    if (!keepPage) params.delete("page")

    const query = params.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname)
    })
  }

  return { searchParams, pathname, router, isPending, apply, startTransition }
}

export function DocumentFilters({
  categories,
  projects,
  pageSizes,
  defaultPageSize,
}: {
  categories: FilterOption[]
  projects: FilterOption[]
  pageSizes: readonly number[]
  defaultPageSize: number
}) {
  const { searchParams, pathname, router, isPending, apply, startTransition } =
    useUrlState()

  const currentSearch = searchParams.get("q") ?? ""
  const currentCategory = searchParams.get("category") ?? ALL
  const currentProject = searchParams.get("project") ?? ALL
  const currentSize = searchParams.get("size") ?? String(defaultPageSize)

  const hasFilters =
    currentSearch !== "" || currentCategory !== ALL || currentProject !== ALL

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <form
        className="relative flex-1 lg:max-w-xs"
        onSubmit={(event) => {
          event.preventDefault()
          const value = new FormData(event.currentTarget).get("q")
          apply({ q: typeof value === "string" ? value.trim() : "" })
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        {/* Uncontrolled and keyed on the URL value: typing needs no React state,
            and Reset or the back button remounts it with the new value. */}
        <Input
          key={currentSearch}
          name="q"
          defaultValue={currentSearch}
          placeholder="Cari nama atau nomor dokumen..."
          className="pl-9"
          aria-label="Cari dokumen"
        />
      </form>

      <Select
        value={currentCategory}
        onValueChange={(value) => apply({ category: value })}
      >
        <SelectTrigger className="lg:w-48" aria-label="Filter kategori">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua kategori</SelectItem>
          {categories.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentProject}
        onValueChange={(value) => apply({ project: value })}
      >
        <SelectTrigger className="lg:w-56" aria-label="Filter proyek">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua proyek</SelectItem>
          {projects.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentSize} onValueChange={(value) => apply({ size: value })}>
        <SelectTrigger className="lg:w-28" aria-label="Jumlah baris per halaman">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pageSizes.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size} baris
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
          onClick={() =>
            startTransition(() => {
              // Keeps the chosen page size; only the filters are cleared.
              const params = new URLSearchParams()
              const size = searchParams.get("size")
              if (size) params.set("size", size)
              const query = params.toString()
              router.replace(query ? `${pathname}?${query}` : pathname)
            })
          }
        >
          <X className="size-4" />
          Reset
        </Button>
      ) : null}
    </div>
  )
}

export function DocumentPagination({
  page,
  pageCount,
  total,
  pageSize,
  shown,
}: {
  page: number
  pageCount: number
  total: number
  pageSize: number
  shown: number
}) {
  const { isPending, apply } = useUrlState()

  if (total === 0) return null

  const first = (page - 1) * pageSize + 1

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs tabular-nums text-muted-foreground">
        Menampilkan {first}–{first + shown - 1} dari {total} dokumen
      </span>

      <div className="flex items-center gap-2">
        <span className="text-xs tabular-nums text-muted-foreground">
          Halaman {page} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={page <= 1 || isPending}
          onClick={() => apply({ page: String(page - 1) }, true)}
        >
          <ChevronLeft className="size-4" />
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={page >= pageCount || isPending}
          onClick={() => apply({ page: String(page + 1) }, true)}
        >
          Berikutnya
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
