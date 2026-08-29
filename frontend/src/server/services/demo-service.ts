import type { UserRole } from "@prisma/client"

import { prisma } from "@/server/db/prisma"

/**
 * Demo role switching (decision D6).
 *
 * Presenting the flow in planning section 38 means moving between CEO, Engineer
 * and Accountant three times. Logging out and back in each time wastes the room's
 * attention, so in demo mode the topbar swaps identity directly.
 *
 * Two hard limits keep this from becoming a privilege-escalation hole:
 *   1. It refuses entirely unless DEMO_MODE is "true". At go-live the env var
 *      flips to false and this function stops working, switcher or not.
 *   2. It only ever returns users flagged isDemo, so it can never assume the
 *      identity of a real account even while demo mode is on.
 *
 * No next/* imports here - see decision D1.
 */

export type DemoIdentity = {
  id: string
  name: string
  email: string
  role: UserRole
  position: string | null
  isDemo: boolean
}

export class DemoModeDisabledError extends Error {
  constructor() {
    super("Demo mode is disabled.")
    this.name = "DemoModeDisabledError"
  }
}

function assertDemoMode() {
  if (process.env.DEMO_MODE !== "true") {
    throw new DemoModeDisabledError()
  }
}

/** Every account the switcher is allowed to offer. */
export async function listDemoIdentities(): Promise<DemoIdentity[]> {
  assertDemoMode()

  const users = await prisma.user.findMany({
    where: { isDemo: true, isActive: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      isDemo: true,
    },
  })

  return users
}

/** Resolves one demo identity by id, or throws if it is not a demo account. */
export async function getDemoIdentity(userId: string): Promise<DemoIdentity> {
  assertDemoMode()

  const user = await prisma.user.findFirst({
    where: { id: userId, isDemo: true, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      isDemo: true,
    },
  })

  if (!user) {
    throw new Error("Akun demo tidak ditemukan.")
  }

  return user
}
