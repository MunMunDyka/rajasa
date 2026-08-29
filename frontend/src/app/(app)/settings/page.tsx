import type { Metadata } from "next"

import { AccessDenied } from "@/components/layout/access-denied"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { APP_NAME, COMPANY_NAME, DEMO_MODE } from "@/config/app"
import { canManageUsers, requireUser } from "@/server/auth/guards"
import { listCategories } from "@/server/services/document-service"

export const metadata: Metadata = { title: "Pengaturan" }

const GROUP_LABELS: Record<string, string> = {
  ENGINEERING: "Teknis",
  FINANCE: "Keuangan",
  GENERAL: "Umum",
}

export default async function SettingsPage() {
  const user = await requireUser()
  if (!canManageUsers(user.role)) {
    return (
      <AccessDenied description="Pengaturan aplikasi hanya dapat diakses oleh Administrator." />
    )
  }

  const categories = await listCategories()

  const grouped = categories.reduce<Record<string, typeof categories>>(
    (accumulator, category) => {
      const key = category.group
      accumulator[key] = accumulator[key] ?? []
      accumulator[key].push(category)
      return accumulator
    },
    {}
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Konfigurasi aplikasi dan kategori dokumen."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Aplikasi</CardTitle>
            <CardDescription>Identitas dan mode operasional portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2.5">
              <span className="text-muted-foreground">Nama aplikasi</span>
              <span className="font-medium">{APP_NAME}</span>
            </div>
            <div className="flex justify-between border-b pb-2.5">
              <span className="text-muted-foreground">Perusahaan</span>
              <span className="font-medium">{COMPANY_NAME}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode demo</span>
              <Badge variant={DEMO_MODE ? "secondary" : "outline"} className="rounded-md">
                {DEMO_MODE ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
            <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
              Mode demo mengaktifkan pengalih peran dan akun contoh di halaman
              masuk. Harus dinonaktifkan sebelum sistem digunakan secara nyata.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Kategori Dokumen</CardTitle>
            <CardDescription>Pengelompokan dokumen yang tersedia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {GROUP_LABELS[group] ?? group}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((category) => (
                    <span
                      key={category.id}
                      className="rounded-md border bg-card px-2 py-0.5 text-xs"
                    >
                      {category.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
              Kategori berasal dari satu sumber terpusat dan dapat diubah tanpa
              menyentuh komponen. Penyuntingan lewat antarmuka belum tersedia
              pada tahap prototipe ini.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
