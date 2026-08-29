import type { Prisma, ProjectStatus, UserRole } from "@prisma/client"

import { DEADLINE_WARNING_DAYS, STALE_PROGRESS_DAYS } from "@/config/app"
import { DEFAULT_REQUIREMENT_TEMPLATE } from "@/config/requirement-templates"
import { prisma } from "@/server/db/prisma"

import { recordActivity } from "./activity-service"

/**
 * Project queries.
 *
 * No next/* imports (decision D1). Everything here takes the caller's identity as
 * a plain argument rather than reading a session, so it stays testable and
 * portable if the API is ever split out.
 */

export type Viewer = { id: string; role: UserRole }

/** Engineers only ever see projects they are assigned to (planning section 7). */
function scopeFor(viewer: Viewer): Prisma.ProjectWhereInput {
  if (viewer.role === "ENGINEER") {
    return { members: { some: { userId: viewer.id } } }
  }
  return {}
}

/**
 * "Delayed" is derived, never stored (planning section 14). Defined once here so
 * the dashboard, the project list and the badges can never disagree.
 */
export function isDelayed(project: {
  status: ProjectStatus
  targetDate: Date
  currentProgress: number
}): boolean {
  if (project.status === "COMPLETED" || project.status === "CANCELLED") return false
  if (project.currentProgress >= 100) return false
  return project.targetDate.getTime() < Date.now()
}

export function isDueSoon(project: {
  status: ProjectStatus
  targetDate: Date
  currentProgress: number
}): boolean {
  if (isDelayed(project)) return false
  if (project.status === "COMPLETED" || project.status === "CANCELLED") return false
  const days = (project.targetDate.getTime() - Date.now()) / 86_400_000
  return days >= 0 && days <= DEADLINE_WARNING_DAYS
}

/** No progress reported for a while, on a project that should be moving. */
export function isStale(project: {
  status: ProjectStatus
  lastProgressAt: Date | null
  startDate: Date
}): boolean {
  if (project.status !== "IN_PROGRESS") return false
  const reference = project.lastProgressAt ?? project.startDate
  const days = (Date.now() - reference.getTime()) / 86_400_000
  return days > STALE_PROGRESS_DAYS
}

// ---------------------------------------------------------------------------

const projectListSelect = {
  id: true,
  code: true,
  name: true,
  status: true,
  startDate: true,
  targetDate: true,
  completedAt: true,
  currentProgress: true,
  lastProgressAt: true,
  clientName: true,
  vesselName: true,
  contractValue: true,
  members: {
    where: { role: "PIC" as const },
    select: { user: { select: { id: true, name: true } } },
  },
  requirements: {
    select: { isMandatory: true, fulfilledById: true, dueDate: true },
  },
} satisfies Prisma.ProjectSelect

export type ProjectListItem = {
  id: string
  code: string
  name: string
  status: ProjectStatus
  startDate: Date
  targetDate: Date
  completedAt: Date | null
  currentProgress: number
  lastProgressAt: Date | null
  clientName: string | null
  vesselName: string | null
  /** Serialised from Prisma Decimal; null when the viewer may not see it. */
  contractValue: string | null
  pic: { id: string; name: string } | null
  documents: { fulfilled: number; total: number; overdue: number }
  flags: { delayed: boolean; dueSoon: boolean; stale: boolean }
}

type RawProject = Prisma.ProjectGetPayload<{ select: typeof projectListSelect }>

function toListItem(project: RawProject, canSeeMoney: boolean): ProjectListItem {
  const mandatory = project.requirements.filter((r) => r.isMandatory)
  const fulfilled = mandatory.filter((r) => r.fulfilledById !== null).length
  const overdue = project.requirements.filter(
    (r) => r.fulfilledById === null && r.dueDate !== null && r.dueDate.getTime() < Date.now()
  ).length

  return {
    id: project.id,
    code: project.code,
    name: project.name,
    status: project.status,
    startDate: project.startDate,
    targetDate: project.targetDate,
    completedAt: project.completedAt,
    currentProgress: project.currentProgress,
    lastProgressAt: project.lastProgressAt,
    clientName: project.clientName,
    vesselName: project.vesselName,
    // Contract values are withheld from Engineers rather than merely hidden in
    // the UI - the number never leaves the server for them.
    contractValue: canSeeMoney ? (project.contractValue?.toString() ?? null) : null,
    pic: project.members[0]?.user ?? null,
    documents: { fulfilled, total: mandatory.length, overdue },
    flags: {
      delayed: isDelayed(project),
      dueSoon: isDueSoon(project),
      stale: isStale(project),
    },
  }
}

export async function listProjects(
  viewer: Viewer,
  options: { status?: ProjectStatus; search?: string; take?: number } = {}
): Promise<ProjectListItem[]> {
  const where: Prisma.ProjectWhereInput = { ...scopeFor(viewer) }

  if (options.status) where.status = options.status
  if (options.search?.trim()) {
    const term = options.search.trim()
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { clientName: { contains: term, mode: "insensitive" } },
      { vesselName: { contains: term, mode: "insensitive" } },
    ]
  }

  const projects = await prisma.project.findMany({
    where,
    select: projectListSelect,
    orderBy: [{ targetDate: "asc" }],
    take: options.take,
  })

  const canSeeMoney = viewer.role !== "ENGINEER"
  return projects.map((project) => toListItem(project, canSeeMoney))
}

export type ProjectStats = {
  total: number
  inProgress: number
  completed: number
  needsAttention: number
  incompleteDocuments: number
}

function summarizeProjects(projects: ProjectListItem[]): ProjectStats {
  return {
    total: projects.length,
    inProgress: projects.filter((p) => p.status === "IN_PROGRESS").length,
    completed: projects.filter((p) => p.status === "COMPLETED").length,
    needsAttention: projects.filter(
      (p) => p.flags.delayed || p.flags.dueSoon || p.flags.stale
    ).length,
    incompleteDocuments: projects.filter(
      (p) => p.documents.total > 0 && p.documents.fulfilled < p.documents.total
    ).length,
  }
}

/**
 * Dashboard counters. Derived from the same list the table renders, so the number
 * on a card and the rows underneath can never contradict each other - the classic
 * dashboard bug where the badge says 2 and the list shows 3.
 */
export async function getProjectStats(viewer: Viewer): Promise<ProjectStats> {
  const projects = await listProjects(viewer)
  return summarizeProjects(projects)
}

export type ProjectDetail = ProjectListItem & {
  description: string | null
  location: string | null
  members: {
    id: string
    name: string
    email: string
    position: string | null
    role: "PIC" | "MEMBER"
  }[]
}

/**
 * One project, scoped to the viewer. Returns null rather than throwing when the
 * project does not exist or is not theirs - the caller answers 404 either way,
 * and telling the two apart would itself leak which project codes exist.
 */
export async function getProject(
  viewer: Viewer,
  projectId: string
): Promise<ProjectDetail | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...scopeFor(viewer) },
    select: {
      ...projectListSelect,
      description: true,
      location: true,
      // Overrides the PIC-only selection in projectListSelect: the detail page
      // shows the whole assigned team.
      members: {
        orderBy: [{ role: "asc" }, { assignedAt: "asc" }],
        select: {
          role: true,
          user: {
            select: { id: true, name: true, email: true, position: true },
          },
        },
      },
    },
  })

  if (!project) return null

  const canSeeMoney = viewer.role !== "ENGINEER"
  const pic = project.members.find((member) => member.role === "PIC")

  return {
    ...toListItem({ ...project, members: pic ? [pic] : [] }, canSeeMoney),
    description: project.description,
    location: project.location,
    members: project.members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      position: member.user.position,
      role: member.role,
    })),
  }
}

export type AttentionReason = "DELAYED" | "DUE_SOON" | "STALE" | "DOCUMENTS"

export type AttentionItem = ProjectListItem & {
  reasons: AttentionReason[]
}

function rankAttentionProjects(projects: ProjectListItem[]): AttentionItem[] {
  const flagged = projects
    .map((project) => {
      const reasons: AttentionReason[] = []
      if (project.flags.delayed) reasons.push("DELAYED")
      if (project.flags.dueSoon) reasons.push("DUE_SOON")
      if (project.flags.stale) reasons.push("STALE")
      if (project.documents.overdue > 0) reasons.push("DOCUMENTS")
      return { ...project, reasons }
    })
    .filter((project) => project.reasons.length > 0)

  return flagged.sort((a, b) => {
    if (b.reasons.length !== a.reasons.length) return b.reasons.length - a.reasons.length
    return a.targetDate.getTime() - b.targetDate.getTime()
  })
}

/** Projects the CEO should look at first (planning section 13). */
export async function getAttentionProjects(viewer: Viewer): Promise<AttentionItem[]> {
  const projects = await listProjects(viewer)
  return rankAttentionProjects(projects)
}

/** One database read supplies all project-backed dashboard sections. */
/** How many rows the dashboard table shows before deferring to /projects. */
export const DASHBOARD_PROJECT_LIMIT = 5

export async function getDashboardProjectData(
  viewer: Viewer,
  filters: { status?: ProjectStatus; search?: string } = {}
): Promise<{
  stats: ProjectStats
  projects: ProjectListItem[]
  matchCount: number
  filtered: boolean
}> {
  // Counters always describe every project the viewer can see, never the
  // filtered subset - otherwise filtering the table would silently rewrite the
  // headline numbers above it.
  const all = await listProjects(viewer)

  const filtered = Boolean(filters.status || filters.search?.trim())
  const matching = filtered ? await listProjects(viewer, filters) : all

  return {
    stats: summarizeProjects(all),
    projects: matching.slice(0, DASHBOARD_PROJECT_LIMIT),
    matchCount: matching.length,
    filtered,
  }
}


// ---------------------------------------------------------------------------
// Creating projects
// ---------------------------------------------------------------------------

export type ProjectAdminErrorCode =
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "CODE_TAKEN"
  | "NOT_FOUND"

export class ProjectAdminError extends Error {
  constructor(
    message: string,
    readonly code: ProjectAdminErrorCode
  ) {
    super(message)
    this.name = "ProjectAdminError"
  }
}

/** Only Admin and CEO create projects (planning section 7). */
function assertCanManage(actor: Viewer) {
  if (actor.role !== "ADMIN" && actor.role !== "CEO") {
    throw new ProjectAdminError(
      "Hanya Administrator dan Direktur Utama yang dapat membuat proyek.",
      "FORBIDDEN"
    )
  }
}

/**
 * Next free code for the current year, e.g. RKL-2026-017.
 *
 * Only a suggestion for the form - the field stays editable and uniqueness is
 * enforced on save, because two people opening the form at once would otherwise
 * both be handed the same number.
 */
export async function suggestProjectCode(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `RKL-${year}-`

  const latest = await prisma.project.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  })

  const lastNumber = latest ? Number.parseInt(latest.code.slice(prefix.length), 10) : 0
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1

  return `${prefix}${String(next).padStart(3, "0")}`
}

/** Engineers available to be named PIC. */
export async function listAssignableEngineers() {
  return prisma.user.findMany({
    where: { role: "ENGINEER", isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, position: true },
  })
}

export type CreateProjectInput = {
  code: string
  name: string
  description: string | null
  clientName: string | null
  location: string | null
  vesselName: string | null
  contractValue: string | null
  startDate: Date
  targetDate: Date
  status: ProjectStatus
  picUserId: string | null
}

/**
 * Creates a project, assigns its PIC, and seeds the document requirement
 * checklist - all in one transaction.
 *
 * The checklist matters: a new project has to read 0/6 immediately, not stay
 * blank until somebody remembers to add requirements by hand. That is also the
 * moment the client sees during a demo.
 */
export async function createProject(
  actor: Viewer,
  input: CreateProjectInput
): Promise<{ id: string }> {
  assertCanManage(actor)

  const code = input.code.trim().toUpperCase()
  const name = input.name.trim()

  if (!code) throw new ProjectAdminError("Kode proyek wajib diisi.", "INVALID_INPUT")
  if (!name) throw new ProjectAdminError("Nama proyek wajib diisi.", "INVALID_INPUT")

  if (Number.isNaN(input.startDate.getTime()) || Number.isNaN(input.targetDate.getTime())) {
    throw new ProjectAdminError("Tanggal tidak valid.", "INVALID_INPUT")
  }
  if (input.targetDate.getTime() < input.startDate.getTime()) {
    throw new ProjectAdminError(
      "Target selesai tidak boleh lebih awal dari tanggal mulai.",
      "INVALID_INPUT"
    )
  }

  const existing = await prisma.project.findUnique({
    where: { code },
    select: { id: true },
  })
  if (existing) {
    throw new ProjectAdminError(`Kode ${code} sudah dipakai proyek lain.`, "CODE_TAKEN")
  }

  if (input.picUserId) {
    const pic = await prisma.user.findFirst({
      where: { id: input.picUserId, role: "ENGINEER", isActive: true },
      select: { id: true },
    })
    if (!pic) {
      throw new ProjectAdminError("Engineer PIC tidak ditemukan.", "NOT_FOUND")
    }
  }

  const categories = await prisma.documentCategory.findMany({
    select: { id: true, key: true },
  })
  const categoryIdByKey = new Map(categories.map((c) => [c.key, c.id]))

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        code,
        name,
        description: input.description?.trim() || null,
        clientName: input.clientName?.trim() || null,
        location: input.location?.trim() || null,
        vesselName: input.vesselName?.trim() || null,
        contractValue: input.contractValue?.trim() || null,
        startDate: input.startDate,
        targetDate: input.targetDate,
        status: input.status,
        currentProgress: 0,
        createdById: actor.id,
      },
      select: { id: true, name: true },
    })

    if (input.picUserId) {
      await tx.projectMember.create({
        data: { projectId: project.id, userId: input.picUserId, role: "PIC" },
      })
    }

    await tx.documentRequirement.createMany({
      data: DEFAULT_REQUIREMENT_TEMPLATE.map((item) => ({
        projectId: project.id,
        label: item.label,
        categoryId: item.categoryKey
          ? (categoryIdByKey.get(item.categoryKey) ?? null)
          : null,
        isMandatory: item.isMandatory,
        sortOrder: item.sortOrder,
        dueDate:
          item.dueAfterDays === null
            ? null
            : new Date(input.startDate.getTime() + item.dueAfterDays * 86_400_000),
      })),
    })

    await recordActivity(tx, {
      actorId: actor.id,
      projectId: project.id,
      action: "PROJECT_CREATED",
      summary: `membuat proyek ${project.name}`,
      targetType: "Project",
      targetId: project.id,
    })

    if (input.picUserId) {
      await recordActivity(tx, {
        actorId: actor.id,
        projectId: project.id,
        action: "MEMBER_ASSIGNED",
        summary: `menugaskan PIC untuk proyek ${project.name}`,
        targetType: "User",
        targetId: input.picUserId,
      })
    }

    return { id: project.id }
  })
}

export function projectAdminErrorStatus(code: ProjectAdminErrorCode): number {
  switch (code) {
    case "FORBIDDEN":
      return 403
    case "NOT_FOUND":
      return 404
    case "CODE_TAKEN":
      return 409
    default:
      return 400
  }
}
