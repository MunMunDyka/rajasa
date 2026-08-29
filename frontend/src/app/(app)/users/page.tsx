import type { Metadata } from "next"

import { AccessDenied } from "@/components/layout/access-denied"
import { PageHeader } from "@/components/layout/page-header"
import { UserActiveToggle } from "@/components/users/user-active-toggle"
import {
  CreateUserDialog,
  EditUserDialog,
  ResetPasswordDialog,
} from "@/components/users/user-dialogs"
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
import { cn } from "@/lib/utils"
import { canManageUsers, requireUser } from "@/server/auth/guards"
import { listUsers, type UserListItem } from "@/server/services/user-service"

export const metadata: Metadata = { title: "Pengguna" }

function StatusDot({ isActive }: { isActive: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
      <span
        className={cn(
          "size-1.5 rounded-full",
          isActive ? "bg-success" : "bg-muted-foreground/40"
        )}
      />
      {isActive ? "Aktif" : "Nonaktif"}
    </span>
  )
}

function RowActions({ user, isSelf }: { user: UserListItem; isSelf: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <EditUserDialog
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          position: user.position,
        }}
        isSelf={isSelf}
      />
      <ResetPasswordDialog
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          position: user.position,
        }}
      />
      <UserActiveToggle
        userId={user.id}
        userName={user.name}
        isActive={user.isActive}
        isSelf={isSelf}
      />
    </div>
  )
}

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
    <div className="space-y-5">
      <PageHeader
        title="Pengguna"
        description="Kelola akun, peran, dan akses masuk ke sistem."
        actions={<CreateUserDialog />}
      />

      <Card className="py-0">
        <CardContent className="px-0">
          {/* Card list below lg. Six columns plus three actions is a sideways
              scroll nobody discovers on a phone. */}
          <div className="divide-y lg:hidden">
            {users.map((item) => (
              <article key={item.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug text-brand-navy">
                      {item.name}
                      {item.id === user.id ? (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          (Anda)
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {item.email}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md border bg-card px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                    {ROLE_LABELS[item.role]}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{item.position ?? "Tanpa jabatan"}</span>
                  <span className="tabular-nums">{item.projectCount} proyek</span>
                  <StatusDot isActive={item.isActive} />
                </div>

                <RowActions user={item} isSelf={item.id === user.id} />
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <Table>
              <TableHeader className="bg-transparent">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-48">Nama</TableHead>
                  <TableHead className="min-w-48">Email</TableHead>
                  <TableHead className="min-w-32">Peran</TableHead>
                  <TableHead className="min-w-40">Jabatan</TableHead>
                  <TableHead className="min-w-20">Proyek</TableHead>
                  <TableHead className="min-w-24">Status</TableHead>
                  <TableHead className="min-w-64 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "border-0 hover:bg-muted/40",
                      !item.isActive && "opacity-60"
                    )}
                  >
                    <TableCell className="font-medium">
                      {item.name}
                      {item.id === user.id ? (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          (Anda)
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.email}
                    </TableCell>
                    <TableCell className="text-sm">
                      {ROLE_LABELS[item.role]}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.position ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {item.projectCount}
                    </TableCell>
                    <TableCell>
                      <StatusDot isActive={item.isActive} />
                    </TableCell>
                    <TableCell>
                      <RowActions user={item} isSelf={item.id === user.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Pengguna tidak dapat dihapus permanen. Dokumen dan laporan progress
        menunjuk ke penulisnya, jadi akun yang sudah tidak dipakai dinonaktifkan
        agar riwayat proyek tetap utuh.
      </p>
    </div>
  )
}
