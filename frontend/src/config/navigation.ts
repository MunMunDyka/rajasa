import type { UserRole } from "@prisma/client"
import {
  Activity,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"

/**
 * Role-based navigation (planning section 8).
 *
 * Navigation is data, not markup: the sidebar renders whatever this returns, so a
 * role never sees a menu it has no business seeing. This is a usability measure,
 * not a security one - the real enforcement is in src/server/auth/guards.ts.
 */

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** Marks the item active for any path beneath it, not just an exact match. */
  matchPrefix?: boolean
}

export type NavSection = {
  /** Optional heading above a group. */
  label?: string
  items: NavItem[]
}

const NAVIGATION: Record<UserRole, NavSection[]> = {
  ADMIN: [
    {
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Operasional",
      items: [
        { label: "Proyek", href: "/projects", icon: FolderKanban, matchPrefix: true },
        { label: "Dokumen", href: "/documents", icon: FileText, matchPrefix: true },
      ],
    },
    {
      label: "Administrasi",
      items: [
        { label: "Pengguna", href: "/users", icon: Users, matchPrefix: true },
        { label: "Pengaturan", href: "/settings", icon: Settings, matchPrefix: true },
      ],
    },
  ],

  CEO: [
    {
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Monitoring",
      items: [
        { label: "Proyek", href: "/projects", icon: FolderKanban, matchPrefix: true },
        { label: "Dokumen", href: "/documents", icon: FileText, matchPrefix: true },
        { label: "Aktivitas Terkini", href: "/activity", icon: Activity, matchPrefix: true },
      ],
    },
  ],

  ENGINEER: [
    {
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Pekerjaan Saya",
      items: [
        { label: "Proyek Saya", href: "/projects", icon: FolderKanban, matchPrefix: true },
        { label: "Dokumen", href: "/documents", icon: FileText, matchPrefix: true },
      ],
    },
  ],

  ACCOUNTANT: [
    {
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Keuangan",
      items: [
        { label: "Proyek", href: "/projects", icon: FolderKanban, matchPrefix: true },
        { label: "Dokumen Keuangan", href: "/documents/finance", icon: Receipt, matchPrefix: true },
        { label: "Semua Dokumen", href: "/documents", icon: FileText },
      ],
    },
  ],
}

export function getNavigation(role: UserRole): NavSection[] {
  return NAVIGATION[role]
}

/** Human labels for roles, used in the topbar and the user table. */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  CEO: "Direktur Utama",
  ENGINEER: "Engineer",
  ACCOUNTANT: "Finance",
}
