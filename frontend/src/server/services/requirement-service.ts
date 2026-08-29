import { prisma } from "@/server/db/prisma"

/**
 * Document requirements - "Kelengkapan Dokumen" (planning section 19b).
 *
 * Status is derived here rather than stored, for the same reason "delayed" is:
 * a stored status goes stale the moment a due date passes with nobody logged in.
 *
 * No next/* imports (decision D1).
 */

export type RequirementStatus = "FULFILLED" | "OUTSTANDING" | "OVERDUE"

export type RequirementItem = {
  id: string
  label: string
  isMandatory: boolean
  dueDate: Date | null
  notes: string | null
  status: RequirementStatus
  category: { key: string; label: string } | null
  fulfilledBy: {
    id: string
    name: string
    uploadedAt: Date
    uploadedBy: string
  } | null
}

export function requirementStatus(requirement: {
  fulfilledById: string | null
  dueDate: Date | null
}): RequirementStatus {
  if (requirement.fulfilledById) return "FULFILLED"
  if (requirement.dueDate && requirement.dueDate.getTime() < Date.now()) {
    return "OVERDUE"
  }
  return "OUTSTANDING"
}

export async function listRequirements(
  projectId: string
): Promise<RequirementItem[]> {
  const rows = await prisma.documentRequirement.findMany({
    where: { projectId },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: {
      id: true,
      label: true,
      isMandatory: true,
      dueDate: true,
      notes: true,
      fulfilledById: true,
      category: { select: { key: true, label: true } },
      fulfilledBy: {
        select: {
          id: true,
          name: true,
          uploadedAt: true,
          uploadedBy: { select: { name: true } },
        },
      },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    isMandatory: row.isMandatory,
    dueDate: row.dueDate,
    notes: row.notes,
    status: requirementStatus(row),
    category: row.category,
    fulfilledBy: row.fulfilledBy
      ? {
          id: row.fulfilledBy.id,
          name: row.fulfilledBy.name,
          uploadedAt: row.fulfilledBy.uploadedAt,
          uploadedBy: row.fulfilledBy.uploadedBy.name,
        }
      : null,
  }))
}

export type RequirementSummary = {
  fulfilled: number
  total: number
  overdue: number
}

export function summarise(items: RequirementItem[]): RequirementSummary {
  const mandatory = items.filter((item) => item.isMandatory)
  return {
    fulfilled: mandatory.filter((item) => item.status === "FULFILLED").length,
    total: mandatory.length,
    overdue: items.filter((item) => item.status === "OVERDUE").length,
  }
}
