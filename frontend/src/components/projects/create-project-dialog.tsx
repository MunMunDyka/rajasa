"use client"

import { FolderPlus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createProjectAction } from "@/app/(app)/projects/_actions/projects"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export type EngineerOption = { id: string; name: string; position: string | null }

const STATUS_OPTIONS = [
  { value: "PLANNING", label: "Perencanaan" },
  { value: "IN_PROGRESS", label: "Berjalan" },
  { value: "ON_HOLD", label: "Ditahan" },
]

/** yyyy-mm-dd in local time, for <input type="date">. */
function toDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/**
 * Create project.
 *
 * The suggested code comes from the server and stays editable: two people
 * opening this form at the same time would otherwise be handed the same number,
 * so uniqueness is settled on save rather than here.
 *
 * Dates default to today and three months out, because a project with no
 * target date cannot be flagged as delayed and quietly falls out of every
 * attention list.
 */
export function CreateProjectDialog({
  suggestedCode,
  engineers,
  canSeeFinancials,
}: {
  suggestedCode: string
  engineers: EngineerOption[]
  canSeeFinancials: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const today = new Date()
  const inThreeMonths = new Date(today)
  inThreeMonths.setMonth(inThreeMonths.getMonth() + 3)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await createProjectAction(formData)
      if (result.ok) {
        toast.success("Proyek berhasil dibuat.")
        setOpen(false)
        // Straight to the new project: the checklist already reads 0/6 there,
        // which is the point of creating it.
        router.push(`/projects/${result.projectId}`)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FolderPlus className="size-4" />
          Buat Proyek
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Buat Proyek Baru</DialogTitle>
            <DialogDescription>
              Daftar dokumen wajib akan dibuat otomatis mengikuti template, jadi
              kelengkapan proyek langsung terpantau sejak hari pertama.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <Field
              id="code"
              label="Kode proyek"
              hint="Diusulkan otomatis, boleh diubah."
            >
              <Input
                id="code"
                name="code"
                defaultValue={suggestedCode}
                required
                disabled={isPending}
                className="font-mono"
              />
            </Field>

            <Field id="status" label="Status awal">
              <Select name="status" defaultValue="PLANNING" disabled={isPending}>
                <SelectTrigger id="status" className="w-full">
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
            </Field>

            <div className="sm:col-span-2">
              <Field id="name" label="Nama proyek">
                <Input
                  id="name"
                  name="name"
                  required
                  disabled={isPending}
                  placeholder="Docking Preparation MV Sinar Jaya"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field id="description" label="Deskripsi">
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  disabled={isPending}
                  placeholder="Ruang lingkup pekerjaan secara singkat."
                />
              </Field>
            </div>

            <Field id="clientName" label="Klien">
              <Input
                id="clientName"
                name="clientName"
                disabled={isPending}
                placeholder="PT Samudra Nusantara Line"
              />
            </Field>

            <Field id="vesselName" label="Kapal">
              <Input
                id="vesselName"
                name="vesselName"
                disabled={isPending}
                placeholder="MV Sinar Jaya"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field id="location" label="Lokasi">
                <Input
                  id="location"
                  name="location"
                  disabled={isPending}
                  placeholder="Pelabuhan Tanjung Priok, Jakarta"
                />
              </Field>
            </div>

            <Field id="startDate" label="Tanggal mulai">
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
                disabled={isPending}
                defaultValue={toDateInput(today)}
              />
            </Field>

            <Field id="targetDate" label="Target selesai">
              <Input
                id="targetDate"
                name="targetDate"
                type="date"
                required
                disabled={isPending}
                defaultValue={toDateInput(inThreeMonths)}
              />
            </Field>

            <div className={canSeeFinancials ? "" : "sm:col-span-2"}>
              <Field
                id="picUserId"
                label="Engineer PIC"
                hint={
                  engineers.length === 0
                    ? "Belum ada engineer aktif. Tambahkan lewat menu Pengguna."
                    : "Hanya PIC yang dapat memperbarui progress proyek ini."
                }
              >
                <Select
                  name="picUserId"
                  defaultValue="__none__"
                  disabled={isPending || engineers.length === 0}
                >
                  <SelectTrigger id="picUserId" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Belum ditentukan</SelectItem>
                    {engineers.map((engineer) => (
                      <SelectItem key={engineer.id} value={engineer.id}>
                        {engineer.name}
                        {engineer.position ? ` · ${engineer.position}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Contract value is hidden from anyone who may not see financials,
                the same rule the project detail page applies. */}
            {canSeeFinancials ? (
              <Field
                id="contractValue"
                label="Nilai kontrak"
                hint="Angka saja, tanpa titik. Boleh dikosongkan."
              >
                <Input
                  id="contractValue"
                  name="contractValue"
                  inputMode="numeric"
                  disabled={isPending}
                  placeholder="1850000000"
                />
              </Field>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              Buat Proyek
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
