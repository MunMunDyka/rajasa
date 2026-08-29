import type { Prisma, ProjectStatus, UserRole } from "@prisma/client"

import { DEADLINE_WARNING_DAYS, STALE_PROGRESS_DAYS } from "@/config/app"
import { prisma } from "@/server/db/prisma"

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
