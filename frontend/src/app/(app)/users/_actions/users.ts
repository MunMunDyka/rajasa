"use server"

import type { UserRole } from "@prisma/client"
import { revalidatePath } from "next/cache"

import { requireUser } from "@/server/auth/guards"
import {
  UserAdminError,
  createUser,
  resetPassword,
  setUserActive,
  updateUser,
} from "@/server/services/user-service"

/**
 * Server actions for the user admin page.
 *
 * Thin by design: they resolve the session, hand off to the service, and turn a
 * thrown UserAdminError into a message the dialog can show. Every rule - who may
 * act, the last-admin guard, the self-edit guards - lives in the service, so it
 * holds no matter which entry point is used.
 */

export type ActionResult = { ok: true } | { ok: false; message: string }

const ROLES: UserRole[] = ["ADMIN", "CEO", "ENGINEER", "ACCOUNTANT"]

function parseRole(value: unknown): UserRole {
  if (typeof value === "string" && ROLES.includes(value as UserRole)) {
    return value as UserRole
  }
  throw new UserAdminError("Peran tidak dikenal.", "INVALID_INPUT")
}

async function run(work: (actor: { id: string; role: UserRole }) => Promise<void>): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await work({ id: user.id, role: user.role })
    revalidatePath("/users")
    return { ok: true }
  } catch (error) {
    if (error instanceof UserAdminError) {
      return { ok: false, message: error.message }
    }
    console.error("User admin action failed", error)
    return { ok: false, message: "Terjadi kesalahan. Coba kembali." }
  }
}

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  return run(async (actor) => {
    await createUser(actor, {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: parseRole(formData.get("role")),
      position: String(formData.get("position") ?? "") || null,
      password: String(formData.get("password") ?? ""),
    })
  })
}

export async function updateUserAction(formData: FormData): Promise<ActionResult> {
  const userId = String(formData.get("userId") ?? "")
  return run(async (actor) => {
    await updateUser(actor, userId, {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: parseRole(formData.get("role")),
      position: String(formData.get("position") ?? "") || null,
    })
  })
}

export async function resetPasswordAction(formData: FormData): Promise<ActionResult> {
  const userId = String(formData.get("userId") ?? "")
  return run(async (actor) => {
    await resetPassword(actor, userId, String(formData.get("password") ?? ""))
  })
}

export async function setUserActiveAction(
  userId: string,
  isActive: boolean
): Promise<ActionResult> {
  return run(async (actor) => {
    await setUserActive(actor, userId, isActive)
  })
}
