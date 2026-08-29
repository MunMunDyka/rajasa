"use client"

import type { UserRole } from "@prisma/client"
import { ChevronDown, LogOut, Repeat2 } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { switchDemoIdentity } from "@/app/(app)/_actions/demo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { APP_NAME } from "@/config/app"
import { ROLE_LABELS } from "@/config/navigation"

export type DemoOption = {
  id: string
  name: string
  role: UserRole
  position: string | null
}

type TopbarProps = {
  user: { id: string; name: string; email: string; role: UserRole; position: string | null }
  /** Empty when demo mode is off, which removes the switcher entirely. */
  demoOptions: DemoOption[]
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function Topbar({ user, demoOptions }: TopbarProps) {
  const router = useRouter()
  const { update } = useSession()
  const [isPending, startTransition] = useTransition()

  function handleSwitch(optionId: string) {
    startTransition(async () => {
      try {
        const identity = await switchDemoIdentity(optionId)
        await update({ user: identity })
        toast.success(`Beralih ke ${identity.name} (${ROLE_LABELS[identity.role]})`)
        router.replace("/dashboard")
        router.refresh()
      } catch {
        toast.error("Gagal beralih akun demo.")
      }
    })
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-card/95 px-4 backdrop-blur sm:px-6">
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-brand-navy" />
      <Separator orientation="vertical" className="mr-1 h-5" />

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-brand-navy md:hidden">
          {APP_NAME}
        </p>
        <p className="hidden text-xs font-medium text-muted-foreground md:block">
          Portal Operasional RKL
        </p>
      </div>

      <div className="flex-1" />

      {demoOptions.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isPending} className="gap-2">
              <Repeat2 className="size-4" />
              <span className="hidden sm:inline">Mode Demo</span>
              <Badge variant="secondary" className="hidden font-normal md:inline-flex">
                {ROLE_LABELS[user.role]}
              </Badge>
              <ChevronDown className="size-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Beralih peran tanpa keluar — hanya tersedia di mode demo.
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {demoOptions.map((option) => (
              <DropdownMenuItem
                key={option.id}
                disabled={option.id === user.id || isPending}
                onSelect={() => handleSwitch(option.id)}
                className="flex-col items-start gap-0.5"
              >
                <span className="text-sm font-medium">{option.name}</span>
                <span className="text-xs text-muted-foreground">
                  {ROLE_LABELS[option.role]}
                  {option.position ? ` · ${option.position}` : ""}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 gap-2 px-2">
            <Avatar className="size-8">
              <AvatarFallback className="bg-brand-navy text-xs font-semibold text-white">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-36 truncate text-sm font-medium leading-tight">
                {user.name}
              </span>
              <span className="block text-[11px] leading-tight text-muted-foreground">
                {ROLE_LABELS[user.role]}
              </span>
            </span>
            <ChevronDown className="size-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm">{user.name}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
            <Badge variant="secondary" className="mt-1.5 w-fit font-normal">
              {ROLE_LABELS[user.role]}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut({ redirectTo: "/login" })}>
            <LogOut className="size-4" />
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
