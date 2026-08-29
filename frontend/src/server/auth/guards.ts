import type { UserRole } from "@prisma/client"

import { auth } from "./index"

/**
 * Server-side access checks.
 *
 * Every route handler, server action and protected page starts with one of these.
 * Middleware only proves that *someone* is signed in - it never proves that this
 * particular person may perform this particular action, so role checks always
 * happen again here, close to the data.
 */

export class UnauthorizedError extends Error {
  constructor(message = "Anda harus masuk terlebih dahulu.") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Anda tidak memiliki akses untuk tindakan ini.") {
    super(message)
    this.name = "ForbiddenError"
  }
}

export type SessionUser = {
  id: string
  name: string
  email: string
  role: UserRole
  position: string | null
  isDemo: boolean
}

/** Returns the signed-in user, or null. Use when absence is a normal case. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
    position: session.user.position,
    isDemo: session.user.isDemo,
  }
}

/** Returns the signed-in user, or throws. Use when absence is a bug. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new UnauthorizedError()
  return user
}

export async function requireRole(...allowed: UserRole[]): Promise<SessionUser> {
  const user = await requireUser()
  if (!allowed.includes(user.role)) throw new ForbiddenError()
  return user
}

// ---------------------------------------------------------------------------
// Capability checks (planning section 7 permission matrix, decision D5)
// ---------------------------------------------------------------------------

/** Who may upload a standalone Project Document. Never an Engineer. */
export function canUploadProjectDocument(role: UserRole): boolean {
  return role === "ADMIN" || role === "CEO" || role === "ACCOUNTANT"
}

/** Who may attach evidence to a progress update. Engineers only. */
export function canUploadProgressEvidence(role: UserRole): boolean {
  return role === "ENGINEER"
}

/** Who may submit a progress update at all. Assignment is checked separately. */
export function canUpdateProgress(role: UserRole): boolean {
  return role === "ENGINEER"
}

/** Delete is Admin-only in the prototype, and always a soft delete. */
export function canDeleteDocument(role: UserRole): boolean {
  return role === "ADMIN"
}

export function canManageProjects(role: UserRole): boolean {
  return role === "ADMIN" || role === "CEO"
}

export function canManageUsers(role: UserRole): boolean {
  return role === "ADMIN"
}

/** Contract values are hidden from Engineers. */
export function canSeeFinancials(role: UserRole): boolean {
  return role === "ADMIN" || role === "CEO" || role === "ACCOUNTANT"
}

/** Engineers only ever see the projects they are assigned to. */
export function seesAllProjects(role: UserRole): boolean {
  return role !== "ENGINEER"
}
