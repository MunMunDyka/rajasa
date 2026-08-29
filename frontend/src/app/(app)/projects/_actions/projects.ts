"use server"

import type { ProjectStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"

import { requireUser } from "@/server/auth/guards"
import {
  ProjectAdminError,
  createProject,
} from "@/server/services/project-service"

/**
 * Server action for creating a project.
 *
 * Thin: resolve the session, hand off to the service, translate a thrown
 * ProjectAdminError into a message the dialog can show. Every rule - who may
 * create, code uniqueness, date sanity - lives in the service.
 */

export type CreateProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; message: string }

const STATUSES: ProjectStatus[] = [
  "PLANNING",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
]

function text(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function optional(formData: FormData, key: string): string | null {
  return text(formData, key) || null
}

export async function createProjectAction(
  formData: FormData
): Promise<CreateProjectResult> {
  try {
    const user = await requireUser()

    const rawStatus = text(formData, "status")
    const status = STATUSES.includes(rawStatus as ProjectStatus)
      ? (rawStatus as ProjectStatus)
      : "PLANNING"

    // Digits only. The form sends a formatted string like "1.850.000.000";
    // Prisma wants something Decimal can parse.
    const rawValue = text(formData, "contractValue").replace(/[^\d]/g, "")

    const picUserId = text(formData, "picUserId")

    const project = await createProject(
      { id: user.id, role: user.role },
      {
        code: text(formData, "code"),
        name: text(formData, "name"),
        description: optional(formData, "description"),
        clientName: optional(formData, "clientName"),
        location: optional(formData, "location"),
        vesselName: optional(formData, "vesselName"),
        contractValue: rawValue || null,
        startDate: new Date(text(formData, "startDate")),
        targetDate: new Date(text(formData, "targetDate")),
        status,
        picUserId: picUserId === "__none__" ? null : picUserId || null,
      }
    )

    revalidatePath("/projects")
    revalidatePath("/dashboard")

    return { ok: true, projectId: project.id }
  } catch (error) {
    if (error instanceof ProjectAdminError) {
      return { ok: false, message: error.message }
    }
    console.error("Project creation failed", error)
    return { ok: false, message: "Proyek gagal dibuat. Coba kembali." }
  }
}
