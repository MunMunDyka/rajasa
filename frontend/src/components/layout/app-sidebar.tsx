"use client"

import type { UserRole } from "@prisma/client"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { COMPANY_SHORT, LOGO_PATH } from "@/config/app"
import { getNavigation } from "@/config/navigation"

/**
 * Decorative wave at the foot of the sidebar.
 *
 * Three maroon layers, each a little more opaque than the one above it, so the
 * colour builds towards the bottom edge instead of stopping at a hard line.
 * `preserveAspectRatio="none"` lets it stretch to whatever width the sidebar
 * currently has, including the 3rem collapsed rail.
 *
 * aria-hidden: it carries no meaning, and a screen reader announcing a shape
 * here would be noise.
 */
function SidebarWave() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 224 120"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full"
    >
      <path
        fill="var(--brand-maroon)"
        opacity="0.09"
        d="M0,58 C48,22 92,88 140,54 C178,27 204,58 224,44 L224,120 L0,120 Z"
      />
      <path
        fill="var(--brand-maroon)"
        opacity="0.16"
        d="M0,78 C44,44 94,100 144,71 C184,49 208,77 224,65 L224,120 L0,120 Z"
      />
      <path
        fill="var(--brand-maroon)"
        opacity="0.26"
        d="M0,97 C54,71 100,111 150,91 C190,75 210,95 224,87 L224,120 L0,120 Z"
      />
    </svg>
  )
}

export function AppSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const sections = getNavigation(role)

  function isActive(href: string, matchPrefix?: boolean) {
    if (matchPrefix) {
      return pathname === href || pathname.startsWith(`${href}/`)
    }
    return pathname === href
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-17 justify-center border-b border-sidebar-border px-3">
        <div className="flex items-center gap-3">
          <div className="hidden size-8 shrink-0 items-center justify-center rounded-md bg-brand-maroon text-xs font-bold text-white group-data-[collapsible=icon]:flex">
            RKL
          </div>
          <div className="flex min-w-0 items-center gap-3 group-data-[collapsible=icon]:hidden">
            <Image
              src={LOGO_PATH}
              alt={COMPANY_SHORT}
              width={680}
              height={318}
              className="h-10 w-auto shrink-0"
              priority
            />
            <span className="h-7 w-px shrink-0 bg-sidebar-border" />
            <span className="min-w-0 text-[12px] leading-tight font-semibold text-brand-navy">
              ProjectHub
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section, index) => (
          <SidebarGroup key={section.label ?? `section-${index}`} className="px-2 py-2.5">
            {section.label ? (
              <SidebarGroupLabel className="h-7 px-3 text-[11px] font-semibold text-sidebar-foreground/45">
                {section.label}
              </SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const active = isActive(item.href, item.matchPrefix)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className="h-10 gap-3 px-3 text-[13px] data-active:bg-brand-maroon data-active:text-white data-active:shadow-sm hover:bg-sidebar-accent"
                      >
                        <Link
                          href={item.href}
                          onClick={() => setOpenMobile(false)}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="relative overflow-hidden border-t border-sidebar-border p-3 pt-10">
        <SidebarWave />
        <div className="relative flex items-center gap-2 rounded-md bg-card/80 px-2.5 py-2 backdrop-blur-[2px] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span className="size-2 shrink-0 rounded-full bg-success" />
          <p className="text-[11px] leading-tight text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
            Sistem demo aktif
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
