import { Lock } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Shown when a signed-in user reaches a page their role does not cover.
 *
 * Rendered rather than thrown: throwing from a page produces a raw 500, which is
 * both wrong (the request is fine, the permission is not) and an ugly thing to
 * hit in front of a client. The server-side role check still happens first - this
 * is only how the refusal is presented.
 */
export function AccessDenied({
  description = "Halaman ini hanya dapat diakses oleh peran tertentu.",
}: {
  description?: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="rounded-full bg-muted p-3">
          <Lock className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Tidak memiliki akses</p>
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild variant="outline" size="sm" className="mt-1">
          <Link href="/dashboard">Kembali ke dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
