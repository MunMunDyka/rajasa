"use client"

import { Loader2, UserCheck, UserX } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { setUserActiveAction } from "@/app/(app)/users/_actions/users"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

/**
 * Activate / deactivate a user.
 *
 * Deactivation is confirmed, activation is not: one locks somebody out of the
 * system, the other is trivially reversible.
 *
 * There is no delete. Documents and progress reports point at their author, so
 * removing a user would either orphan project history or fail outright.
 */
export function UserActiveToggle({
  userId,
  userName,
  isActive,
  isSelf,
}: {
  userId: string
  userName: string
  isActive: boolean
  isSelf: boolean
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function apply(next: boolean) {
    startTransition(async () => {
      const result = await setUserActiveAction(userId, next)
      if (result.ok) {
        toast.success(
          next ? `${userName} diaktifkan.` : `${userName} dinonaktifkan.`
        )
        setOpen(false)
      } else {
        toast.error(result.message)
      }
    })
  }

  if (isActive) {
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-destructive"
            // The server refuses this as well; disabling avoids offering an
            // action that can only fail.
            disabled={isSelf || isPending}
            title={
              isSelf ? "Anda tidak dapat menonaktifkan akun Anda sendiri." : undefined
            }
          >
            <UserX className="size-3.5" />
            Nonaktifkan
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan {userName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Pengguna ini tidak akan bisa masuk lagi. Dokumen dan laporan
              progress yang pernah dibuatnya tetap tersimpan beserta namanya, dan
              akun ini dapat diaktifkan kembali kapan saja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                // Kept open until the server answers, so a refusal can be shown
                // instead of the dialog vanishing on a failed action.
                event.preventDefault()
                apply(false)
              }}
            >
              {isPending ? <Loader2 className="animate-spin" /> : null}
              Nonaktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 text-muted-foreground hover:text-success"
      disabled={isPending}
      onClick={() => apply(true)}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <UserCheck className="size-3.5" />
      )}
      Aktifkan
    </Button>
  )
}
