"use client"

import type { UserRole } from "@prisma/client"
import { Eye, EyeOff, KeyRound, Loader2, Pencil, UserPlus } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  createUserAction,
  resetPasswordAction,
  updateUserAction,
} from "@/app/(app)/users/_actions/users"
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
import { ROLE_LABELS } from "@/config/navigation"

const ROLES: UserRole[] = ["ADMIN", "CEO", "ENGINEER", "ACCOUNTANT"]
const MIN_PASSWORD_LENGTH = 8

export type EditableUser = {
  id: string
  name: string
  email: string
  role: UserRole
  position: string | null
}

/** Password field with a reveal toggle, shared by the create and reset forms. */
function PasswordField({
  name,
  label,
  disabled,
  helper,
}: {
  name: string
  label: string
  disabled: boolean
  helper?: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          minLength={MIN_PASSWORD_LENGTH}
          required
          disabled={disabled}
          autoComplete="new-password"
          className="pr-10"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {helper ?? `Minimal ${MIN_PASSWORD_LENGTH} karakter.`}
      </p>
    </div>
  )
}

function IdentityFields({
  user,
  disabled,
  lockRole,
}: {
  user?: EditableUser
  disabled: boolean
  lockRole?: string
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="name">Nama lengkap</Label>
        <Input
          id="name"
          name="name"
          defaultValue={user?.name}
          required
          disabled={disabled}
          placeholder="Budi Santoso"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={user?.email}
          required
          disabled={disabled}
          placeholder="nama@perusahaan.co.id"
        />
        <p className="text-xs text-muted-foreground">
          Email ini juga dipakai untuk masuk ke sistem.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="position">Jabatan</Label>
        <Input
          id="position"
          name="position"
          defaultValue={user?.position ?? ""}
          disabled={disabled}
          placeholder="Marine Engineer"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="role">Peran</Label>
        <Select name="role" defaultValue={user?.role ?? "ENGINEER"} disabled={disabled || Boolean(lockRole)}>
          <SelectTrigger id="role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {lockRole ? (
          <p className="text-xs text-muted-foreground">{lockRole}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Peran menentukan menu dan tindakan yang tersedia bagi pengguna ini.
          </p>
        )}
      </div>
    </>
  )
}

function useSubmit(onDone: () => void) {
  const [isPending, startTransition] = useTransition()

  function submit(
    action: (formData: FormData) => Promise<{ ok: boolean; message?: string }>,
    formData: FormData,
    successMessage: string
  ) {
    startTransition(async () => {
      const result = await action(formData)
      if (result.ok) {
        toast.success(successMessage)
        onDone()
      } else {
        toast.error(result.message ?? "Terjadi kesalahan.")
      }
    })
  }

  return { isPending, submit }
}

export function CreateUserDialog() {
  const [open, setOpen] = useState(false)
  const { isPending, submit } = useSubmit(() => setOpen(false))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" />
          Tambah Pengguna
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit(
              createUserAction,
              new FormData(event.currentTarget),
              "Pengguna berhasil ditambahkan."
            )
          }}
        >
          <DialogHeader>
            <DialogTitle>Tambah Pengguna</DialogTitle>
            <DialogDescription>
              Akun baru dapat langsung masuk menggunakan email dan password ini.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <IdentityFields disabled={isPending} />
            <PasswordField
              name="password"
              label="Password awal"
              disabled={isPending}
              helper={`Minimal ${MIN_PASSWORD_LENGTH} karakter. Sampaikan ke pengguna melalui jalur yang aman.`}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditUserDialog({
  user,
  isSelf,
}: {
  user: EditableUser
  isSelf: boolean
}) {
  const [open, setOpen] = useState(false)
  const { isPending, submit } = useSubmit(() => setOpen(false))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8">
          <Pencil className="size-3.5" />
          Ubah
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit(
              updateUserAction,
              new FormData(event.currentTarget),
              "Data pengguna diperbarui."
            )
          }}
        >
          <input type="hidden" name="userId" value={user.id} />

          <DialogHeader>
            <DialogTitle>Ubah Pengguna</DialogTitle>
            <DialogDescription>{user.email}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <IdentityFields
              user={user}
              disabled={isPending}
              // The server refuses this too; disabling the control just avoids
              // offering an action that can only fail.
              lockRole={
                isSelf
                  ? "Anda tidak dapat mengubah peran akun Anda sendiri."
                  : undefined
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ResetPasswordDialog({ user }: { user: EditableUser }) {
  const [open, setOpen] = useState(false)
  const { isPending, submit } = useSubmit(() => setOpen(false))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8">
          <KeyRound className="size-3.5" />
          Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit(
              resetPasswordAction,
              new FormData(event.currentTarget),
              "Password berhasil diatur ulang."
            )
          }}
        >
          <input type="hidden" name="userId" value={user.id} />

          <DialogHeader>
            <DialogTitle>Atur Ulang Password</DialogTitle>
            <DialogDescription>
              Untuk {user.name}. Password lama tidak dapat dilihat, hanya diganti.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <PasswordField
              name="password"
              label="Password baru"
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
