import { prisma } from "@/server/db/prisma"

/**
 * Progress history (planning section 17).
 *
 * ProgressUpdate is the source of truth; Project.currentProgress is only a cache
 * of the latest row. Never read the cache when the history is what matters.
 *
 * No next/* imports (decision D1).
 */

export type ProgressEntry = {
  id: string
  previousProgress: number
  progress: number
  description: string
  reportedAt: Date
  author: { id: string; name: string }
  evidence: {
    id: string
    name: string
    mimeType: string
    originalName: string
    sizeBytes: number
  }[]
}

export async function listProgress(projectId: string): Promise<ProgressEntry[]> {
  return prisma.progressUpdate.findMany({
    where: { projectId },
    orderBy: { reportedAt: "desc" },
    select: {
      id: true,
      previousProgress: true,
      progress: true,
      description: true,
      reportedAt: true,
      author: { select: { id: true, name: true } },
      evidence: {
        where: { deletedAt: null },
        orderBy: { uploadedAt: "asc" },
        select: {
          id: true,
          name: true,
          mimeType: true,
          originalName: true,
          sizeBytes: true,
        },
      },
    },
  })
}

/** Points for the progress chart, oldest first. */
export type ProgressPoint = { date: Date; progress: number }

export function toChartSeries(entries: ProgressEntry[]): ProgressPoint[] {
  return [...entries]
    .sort((a, b) => a.reportedAt.getTime() - b.reportedAt.getTime())
    .map((entry) => ({ date: entry.reportedAt, progress: entry.progress }))
}
