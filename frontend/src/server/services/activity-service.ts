import type { ActivityAction, Prisma } from "@prisma/client"

import { prisma } from "@/server/db/prisma"

import type { Viewer } from "./project-service"

/**
 * Activity feed (planning section 23).
 *
 * Rows are written by the mutating services inside the same transaction as the
 * change itself, so the feed can never drift from the data. Nothing writes here
 * after the fact.
 *
 * No next/* imports (decision D1).
 */

export type ActivityItem = {
  id: string
  action: ActivityAction
  summary: string
  createdAt: Date
  actor: { id: string; name: string; role: string }
  project: { id: string; name: string; code: string } | null
  metadata: Prisma.JsonValue
}

export async function listRecentActivity(
  viewer: Viewer,
  limit = 12
): Promise<ActivityItem[]> {
  // Engineers only see activity on their own projects. Global rows (projectId
  // null, e.g. user administration) stay out of their feed entirely.
  const where: Prisma.ActivityLogWhereInput =
    viewer.role === "ENGINEER"
      ? { project: { members: { some: { userId: viewer.id } } } }
      : {}

  const rows = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      summary: true,
      createdAt: true,
      metadata: true,
      actor: { select: { id: true, name: true, role: true } },
      project: { select: { id: true, name: true, code: true } },
    },
  })

  return rows
}

/**
 * Writes an activity row. Always call this with the `tx` of the transaction that
 * made the change, never on its own afterwards.
 */
export async function recordActivity(
  tx: Prisma.TransactionClient,
  input: {
    actorId: string
    action: ActivityAction
    summary: string
    projectId?: string | null
    metadata?: Prisma.InputJsonValue
    targetType?: string | null
    targetId?: string | null
  }
): Promise<void> {
  await tx.activityLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      summary: input.summary,
      projectId: input.projectId ?? null,
      metadata: input.metadata,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
    },
  })
}
