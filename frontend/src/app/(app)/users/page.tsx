import type { Metadata } from "next"

import { AccessDenied } from "@/components/layout/access-denied"
import { PageHeader } from "@/components/layout/page-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ROLE_LABELS } from "@/config/navigation"
import { initials } from "@/lib/format"
import { canManageUsers, requireUser } from "@/server/auth/guards"
import { listUsers } from "@/server/services/user-service"

export const metadata: Metadata = { title: "Pengguna" }

export default async function UsersPage() {
  // Enforced here, not only by hiding the menu item. Rendered as a refusal
  // rather than thrown, so a wrong URL never shows a 500 during a demo.
  const user = await requireUser()
  if (!canManageUsers(user.role)) {
    return (
      <AccessDenied description="Manajemen pengguna hanya dapat diakses oleh Administrator." />
    )
  }

  const users = await listUsers()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengguna"
        description="Akun yang terdaftar beserta perannya di sistem."
      />

      <Card className="py-0">
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-48">Nama</TableHead>
                  <TableHead className="min-w-48">Email</TableHead>
                  <TableHead className="min-w-32">Peran</TableHead>
                  <TableHead className="min-w-40">Jabatan</TableHead>
                  <TableHead className="min-w-24">Proyek</TableHead>
                  <TableHead className="min-w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-brand-navy/9 text-xs font-semibold text-brand-navy">
                            {initials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-brand-navy">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-md font-medium">
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.position ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {user.projectCount}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span className={user.isActive ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-muted-foreground"} />
                        {user.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Menambah dan menyunting pengguna belum tersedia pada tahap prototipe ini.
      </p>
    </div>
  )
}
