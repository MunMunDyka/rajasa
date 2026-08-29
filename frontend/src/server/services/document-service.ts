import path from "node:path"

import type { CategoryGroup, FileKind, Prisma } from "@prisma/client"

import { ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES } from "@/config/app"
import {
  ACCOUNTANT_CATEGORY_KEYS,
  PROGRESS_EVIDENCE_CATEGORY_KEY,
} from "@/config/document-categories"
import { prisma } from "@/server/db/prisma"
import { hardDeleteFile, putFile } from "@/server/storage"

import { recordActivity } from "./activity-service"
import type { Viewer } from "./project-service"

/**
 * Document queries.
 *
 * Two rules hold everywhere in this file:
 *   - Soft-deleted rows (deletedAt set) never come back.
 *   - Engineers are scoped to their own projects, at the query level rather than
 *     by filtering afterwards, so a bug in a page cannot leak another project's
 *     paperwork.
 *
 * No next/* imports (decision D1).
 */

export type DocumentListItem = {
  id: string
  name: string
  kind: FileKind
  originalName: string
  mimeType: string
  sizeBytes: number
  documentNumber: string | null
  documentDate: Date | null
  uploadedAt: Date
  uploadedBy: { id: string; name: string }
  category: { id: string; key: string; label: string; group: CategoryGroup }
  project: { id: string; name: string; code: string }
}

const documentSelect = {
  id: true,
  name: true,
  kind: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  documentNumber: true,
  documentDate: true,
  uploadedAt: true,
  uploadedBy: { select: { id: true, name: true } },
  category: { select: { id: true, key: true, label: true, group: true } },
  project: { select: { id: true, name: true, code: true } },
} satisfies Prisma.DocumentSelect

function scopeFor(viewer: Viewer): Prisma.DocumentWhereInput {
  const base: Prisma.DocumentWhereInput = { deletedAt: null }
  if (viewer.role === "ENGINEER") {
    base.project = { members: { some: { userId: viewer.id } } }
  }
  return base
}

export type DocumentFilters = {
  projectId?: string
  kind?: FileKind
  categoryKey?: string
  group?: CategoryGroup
  search?: string
  take?: number
}

/**
 * Builds the WHERE clause once so the list query and the count query can never
 * drift apart - a paginator whose total is computed from a different filter set
 * than its rows is the classic source of empty last pages.
 */
function buildWhere(
  viewer: Viewer,
  filters: DocumentFilters
): Prisma.DocumentWhereInput {
  const where = scopeFor(viewer)

  if (filters.projectId) where.projectId = filters.projectId
  if (filters.kind) where.kind = filters.kind

  // Built as one object because category can be constrained on both key and
  // group at once, and assigning twice would drop the first constraint.
  const categoryWhere: Prisma.DocumentCategoryWhereInput = {}
  if (filters.categoryKey) categoryWhere.key = filters.categoryKey
  if (filters.group) categoryWhere.group = filters.group
  if (Object.keys(categoryWhere).length > 0) where.category = categoryWhere

  if (filters.search?.trim()) {
    const term = filters.search.trim()
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { documentNumber: { contains: term, mode: "insensitive" } },
      { originalName: { contains: term, mode: "insensitive" } },
    ]
  }

  return where
}

export async function listDocuments(
  viewer: Viewer,
  filters: DocumentFilters = {}
): Promise<DocumentListItem[]> {
  return prisma.document.findMany({
    where: buildWhere(viewer, filters),
    select: documentSelect,
    orderBy: { uploadedAt: "desc" },
    take: filters.take,
  })
}

export const DOCUMENT_PAGE_SIZES = [5, 10, 15, 25] as const
export const DEFAULT_DOCUMENT_PAGE_SIZE = 5

export type DocumentPage = {
  items: DocumentListItem[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

/**
 * One page of documents, filtered and counted with the same clause.
 *
 * The page number is clamped to the available range rather than trusted, so a
 * stale `?page=9` in a bookmark lands on the last real page instead of an empty
 * table.
 */
export async function listDocumentsPage(
  viewer: Viewer,
  filters: DocumentFilters,
  paging: { page?: number; pageSize?: number } = {}
): Promise<DocumentPage> {
  const where = buildWhere(viewer, filters)

  const pageSize = DOCUMENT_PAGE_SIZES.includes(
    paging.pageSize as (typeof DOCUMENT_PAGE_SIZES)[number]
  )
    ? (paging.pageSize as number)
    : DEFAULT_DOCUMENT_PAGE_SIZE

  const total = await prisma.document.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, paging.page ?? 1), pageCount)

  const items = await prisma.document.findMany({
    where,
    select: documentSelect,
    orderBy: { uploadedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { items, total, page, pageSize, pageCount }
}

/** Projects the viewer may filter by, for the documents page dropdown. */
export async function listFilterableProjects(viewer: Viewer) {
  return prisma.project.findMany({
    where:
      viewer.role === "ENGINEER"
        ? { members: { some: { userId: viewer.id } } }
        : {},
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  })
}

/**
 * Resolves a document for reading, applying the viewer's scope. Returns null
 * rather than throwing so callers can answer 404 without distinguishing
 * "does not exist" from "not yours" - that difference is itself information.
 */
export async function getDocumentForViewer(
  viewer: Viewer,
  documentId: string
): Promise<(DocumentListItem & { storageKey: string }) | null> {
  const where = scopeFor(viewer)

  const document = await prisma.document.findFirst({
    where: { ...where, id: documentId },
    select: { ...documentSelect, storageKey: true },
  })

  return document
}

/** Counts per category group, for the documents page summary. */
export async function countDocumentsByGroup(
  viewer: Viewer,
  filters: DocumentFilters = {}
): Promise<Record<CategoryGroup, number>> {
  const documents = await listDocuments(viewer, filters)

  const counts: Record<CategoryGroup, number> = {
    ENGINEERING: 0,
    FINANCE: 0,
    GENERAL: 0,
  }

  for (const document of documents) {
    counts[document.category.group] += 1
  }

  return counts
}

export async function listCategories() {
  return prisma.documentCategory.findMany({
    where: { isActive: true },
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
    select: { id: true, key: true, label: true, group: true },
  })
}

export type UploadCategory = Awaited<ReturnType<typeof listCategories>>[number]

/** Categories available for a standalone project-document upload. */
export async function listUploadCategories(viewer: Viewer): Promise<UploadCategory[]> {
  if (viewer.role === "ENGINEER") return []

  return prisma.documentCategory.findMany({
    where: {
      isActive: true,
      key:
        viewer.role === "ACCOUNTANT"
          ? { in: [...ACCOUNTANT_CATEGORY_KEYS] }
          : { not: PROGRESS_EVIDENCE_CATEGORY_KEY },
    },
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
    select: { id: true, key: true, label: true, group: true },
  })
}

export type DocumentUploadErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"

export class DocumentUploadError extends Error {
  constructor(
    message: string,
    readonly code: DocumentUploadErrorCode = "INVALID_INPUT"
  ) {
    super(message)
    this.name = "DocumentUploadError"
  }
}

export type CreateProjectDocumentInput = {
  projectId: string
  categoryId: string
  requirementId?: string | null
  name: string
  originalName: string
  mimeType: string
  bytes: Buffer
}

const MIME_BY_EXTENSION = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
} as const

/** Writes a standalone project document and its activity trail atomically. */
export async function createProjectDocument(
  viewer: Viewer,
  input: CreateProjectDocumentInput
): Promise<{ id: string; name: string }> {
  if (viewer.role === "ENGINEER") {
    throw new DocumentUploadError(
      "Engineer hanya dapat mengunggah bukti melalui pembaruan progress.",
      "FORBIDDEN"
    )
  }

  const name = input.name.trim()
  const originalName = input.originalName.trim()
  const extension = path.extname(originalName).toLowerCase()
  const expectedMime = MIME_BY_EXTENSION[extension as keyof typeof MIME_BY_EXTENSION]

  if (!name || name.length > 160) {
    throw new DocumentUploadError("Nama dokumen wajib diisi dan maksimal 160 karakter.")
  }
  if (!originalName || originalName.length > 255) {
    throw new DocumentUploadError("Nama file tidak valid.")
  }
  if (
    !ACCEPTED_EXTENSIONS.includes(extension as (typeof ACCEPTED_EXTENSIONS)[number]) ||
    !expectedMime ||
    input.mimeType !== expectedMime
  ) {
    throw new DocumentUploadError("Format file harus PDF, JPG, JPEG, atau PNG.")
  }
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new DocumentUploadError(
      `Ukuran file harus di antara 1 byte dan ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`
    )
  }

  const categoryWhere: Prisma.DocumentCategoryWhereInput = {
    id: input.categoryId,
    isActive: true,
    key:
      viewer.role === "ACCOUNTANT"
        ? { in: [...ACCOUNTANT_CATEGORY_KEYS] }
        : { not: PROGRESS_EVIDENCE_CATEGORY_KEY },
  }

  const [project, category, requirement] = await Promise.all([
    prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true, name: true },
    }),
    prisma.documentCategory.findFirst({
      where: categoryWhere,
      select: { id: true, label: true },
    }),
    input.requirementId
      ? prisma.documentRequirement.findFirst({
          where: {
            id: input.requirementId,
            projectId: input.projectId,
            fulfilledById: null,
          },
          select: { id: true, label: true },
        })
      : Promise.resolve(null),
  ])

  if (!project) {
    throw new DocumentUploadError("Proyek tidak ditemukan.", "NOT_FOUND")
  }
  if (!category) {
    throw new DocumentUploadError("Kategori tidak tersedia untuk akun ini.", "FORBIDDEN")
  }
  if (input.requirementId && !requirement) {
    throw new DocumentUploadError(
      "Kebutuhan dokumen sudah terpenuhi atau tidak ditemukan.",
      "CONFLICT"
    )
  }

  const stored = await putFile(input.bytes, originalName)

  try {
    return await prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          projectId: project.id,
          kind: "PROJECT_DOCUMENT",
          categoryId: category.id,
          name,
          storageKey: stored.storageKey,
          originalName,
          mimeType: expectedMime,
          sizeBytes: stored.sizeBytes,
          checksum: stored.checksum,
          uploadedById: viewer.id,
        },
        select: { id: true, name: true },
      })

      await recordActivity(tx, {
        actorId: viewer.id,
        action: "DOCUMENT_UPLOADED",
        projectId: project.id,
        summary: `mengunggah dokumen ${name}`,
        metadata: {
          category: category.label,
          originalName,
        },
        targetType: "Document",
        targetId: document.id,
      })

      if (requirement) {
        const fulfilled = await tx.documentRequirement.updateMany({
          where: { id: requirement.id, fulfilledById: null },
          data: { fulfilledById: document.id, fulfilledAt: new Date() },
        })

        if (fulfilled.count !== 1) {
          throw new DocumentUploadError(
            "Kebutuhan dokumen baru saja dipenuhi oleh unggahan lain.",
            "CONFLICT"
          )
        }

        await recordActivity(tx, {
          actorId: viewer.id,
          action: "REQUIREMENT_FULFILLED",
          projectId: project.id,
          summary: `melengkapi kebutuhan ${requirement.label}`,
          metadata: { documentId: document.id },
          targetType: "DocumentRequirement",
          targetId: requirement.id,
        })
      }

      return document
    })
  } catch (error) {
    await hardDeleteFile(stored.storageKey).catch(() => undefined)
    throw error
  }
}
