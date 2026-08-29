import type { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

import { prisma } from "@/server/db/prisma"

import { recordActivity } from "./activity-service"

/**
 * User directory and administration.
 *
 * Every mutation here takes the acting user as an argument and re-checks that
 * they are an ADMIN. The page already guards the route, but a service that
 * trusts its caller is one refactor away from being callable from somewhere
 * that does not check.
 *
 * No next/* imports (decision D1).
 */

export const MIN_PASSWORD_LENGTH = 8

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
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
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

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type UserAdminErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "EMAIL_TAKEN"
  | "INVALID_INPUT"
  | "LAST_ADMIN"
  | "SELF"

export class UserAdminError extends Error {
  constructor(
    message: string,
    readonly code: UserAdminErrorCode
  ) {
    super(message)
    this.name = "UserAdminError"
  }
}

export type Actor = { id: string; role: UserRole }

function assertAdmin(actor: Actor) {
  if (actor.role !== "ADMIN") {
    throw new UserAdminError(
      "Hanya Administrator yang dapat mengelola pengguna.",
      "FORBIDDEN"
    )
  }
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function assertEmailFree(email: string, exceptUserId?: string) {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existing && existing.id !== exceptUserId) {
    throw new UserAdminError("Email sudah digunakan akun lain.", "EMAIL_TAKEN")
  }
}

/**
 * Refuses a change that would leave the system with no active administrator.
 *
 * Without this, an admin can lock everyone out permanently with one dropdown -
 * and the only way back in is editing the database by hand.
 */
async function assertNotLastAdmin(userId: string) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  })
  if (!target || target.role !== "ADMIN" || !target.isActive) return

  const otherActiveAdmins = await prisma.user.count({
    where: { role: "ADMIN", isActive: true, id: { not: userId } },
  })

  if (otherActiveAdmins === 0) {
    throw new UserAdminError(
      "Ini satu-satunya Administrator aktif. Angkat Administrator lain terlebih dahulu.",
      "LAST_ADMIN"
    )
  }
}

function validatePassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new UserAdminError(
      `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`,
      "INVALID_INPUT"
    )
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type CreateUserInput = {
  name: string
  email: string
  role: UserRole
  position: string | null
  password: string
}

export async function createUser(
  actor: Actor,
  input: CreateUserInput
): Promise<UserListItem> {
  assertAdmin(actor)

  const name = input.name.trim()
  const email = normaliseEmail(input.email)

  if (!name) throw new UserAdminError("Nama wajib diisi.", "INVALID_INPUT")
  if (!email) throw new UserAdminError("Email wajib diisi.", "INVALID_INPUT")
  validatePassword(input.password)
  await assertEmailFree(email)

  const passwordHash = await bcrypt.hash(input.password, 10)

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email,
        role: input.role,
        position: input.position?.trim() || null,
        passwordHash,
        // Never created as a demo account: the role switcher may only ever
        // assume identities the seed created.
        isDemo: false,
      },
    })

    await recordActivity(tx, {
      actorId: actor.id,
      action: "USER_CREATED",
      summary: `menambahkan pengguna ${created.name}`,
      targetType: "User",
      targetId: created.id,
      metadata: { role: created.role },
    })

    return created
  })

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    position: user.position,
    isActive: user.isActive,
    isDemo: user.isDemo,
    projectCount: 0,
  }
}

export type UpdateUserInput = {
  name: string
  email: string
  role: UserRole
  position: string | null
}

export async function updateUser(
  actor: Actor,
  userId: string,
  input: UpdateUserInput
): Promise<void> {
  assertAdmin(actor)

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  })
  if (!target) throw new UserAdminError("Pengguna tidak ditemukan.", "NOT_FOUND")

  const name = input.name.trim()
  const email = normaliseEmail(input.email)
  if (!name) throw new UserAdminError("Nama wajib diisi.", "INVALID_INPUT")
  if (!email) throw new UserAdminError("Email wajib diisi.", "INVALID_INPUT")

  const roleChanged = input.role !== target.role

  // Changing your own role is how an admin accidentally locks themselves out
  // of the very page they are standing on.
  if (roleChanged && actor.id === userId) {
    throw new UserAdminError(
      "Anda tidak dapat mengubah peran akun Anda sendiri.",
      "SELF"
    )
  }
  if (roleChanged) await assertNotLastAdmin(userId)

  await assertEmailFree(email, userId)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        role: input.role,
        position: input.position?.trim() || null,
      },
    })

    await recordActivity(tx, {
      actorId: actor.id,
      action: "USER_UPDATED",
      summary: roleChanged
        ? `mengubah peran ${name} menjadi ${input.role}`
        : `memperbarui data pengguna ${name}`,
      targetType: "User",
      targetId: userId,
      metadata: roleChanged ? { from: target.role, to: input.role } : undefined,
    })
  })
}

export async function setUserActive(
  actor: Actor,
  userId: string,
  isActive: boolean
): Promise<void> {
  assertAdmin(actor)

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, isActive: true },
  })
  if (!target) throw new UserAdminError("Pengguna tidak ditemukan.", "NOT_FOUND")

  if (!isActive && actor.id === userId) {
    throw new UserAdminError(
      "Anda tidak dapat menonaktifkan akun Anda sendiri.",
      "SELF"
    )
  }
  if (!isActive) await assertNotLastAdmin(userId)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isActive } })

    await recordActivity(tx, {
      actorId: actor.id,
      action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      summary: `${isActive ? "mengaktifkan" : "menonaktifkan"} pengguna ${target.name}`,
      targetType: "User",
      targetId: userId,
    })
  })
}

export async function resetPassword(
  actor: Actor,
  userId: string,
  newPassword: string
): Promise<void> {
  assertAdmin(actor)
  validatePassword(newPassword)

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  })
  if (!target) throw new UserAdminError("Pengguna tidak ditemukan.", "NOT_FOUND")

  const passwordHash = await bcrypt.hash(newPassword, 10)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } })

    // The new password is deliberately absent from the log. The summary records
    // that a reset happened and who did it, never the secret itself.
    await recordActivity(tx, {
      actorId: actor.id,
      action: "USER_PASSWORD_RESET",
      summary: `mengatur ulang password ${target.name}`,
      targetType: "User",
      targetId: userId,
    })
  })
}

/** Maps a service error onto an HTTP-ish status for route handlers. */
export function userAdminErrorStatus(code: UserAdminErrorCode): number {
  switch (code) {
    case "FORBIDDEN":
      return 403
    case "NOT_FOUND":
      return 404
    case "EMAIL_TAKEN":
      return 409
    case "LAST_ADMIN":
    case "SELF":
      return 422
    default:
      return 400
  }
}
