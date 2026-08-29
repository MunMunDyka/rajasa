import { FileQuestion } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Rendered inside the app shell, so a missing project still shows the sidebar
 * and the user can carry on rather than landing on a bare page.
 *
 * Also what an Engineer gets for a project that exists but is not theirs - the
 * services deliberately do not distinguish the two cases.
 */
export default function AppNotFound() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="rounded-full bg-muted p-3">
          <FileQuestion className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Halaman tidak ditemukan</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Data yang Anda cari tidak tersedia, atau berada di luar akses Anda.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="mt-1">
          <Link href="/dashboard">Kembali ke dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
