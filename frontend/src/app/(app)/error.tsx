"use client"

import { RotateCcw, TriangleAlert } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Safety net for anything that throws inside the app shell.
 *
 * Without this, an unexpected server error renders Next's default error screen -
 * a stack trace in development, a bare "something went wrong" in production.
 * Neither is something to hit while presenting to a client.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <TriangleAlert className="size-5 text-destructive" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Terjadi kesalahan</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Halaman ini gagal dimuat. Coba muat ulang; jika berlanjut, hubungi
            administrator.
          </p>
          {error.digest ? (
            <p className="pt-1 font-mono text-[11px] text-muted-foreground">
              Kode: {error.digest}
            </p>
          ) : null}
        </div>
        <div className="mt-1 flex gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="size-4" />
            Coba lagi
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">Ke dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
