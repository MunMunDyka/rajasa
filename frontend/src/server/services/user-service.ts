import type { UserRole } from "@prisma/client"

import { prisma } from "@/server/db/prisma"

/** User directory, for the admin pages. No next/* imports (decision D1). */

export type UserListItem = {
  id: string
  name: string
  email: string
  role: UserRole
  position: string | null
  isActive: boolean
  isDemo: boolean
  projectCount: number
}

export async function listUsers(): Promise<UserListItem[]> {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      isActive: true,
      isDemo: true,
      _count: { select: { memberships: true } },
    },
  })

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    position: user.position,
    isActive: user.isActive,
    isDemo: user.isDemo,
    projectCount: user._count.memberships,
  }))
}
