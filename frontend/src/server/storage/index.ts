import { createHash, randomUUID } from "node:crypto"
import { createReadStream } from "node:fs"
import { mkdir, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"

/**
 * File storage abstraction.
 *
 * Everything that touches the filesystem goes through here, so swapping local disk
 * for S3 later means rewriting this one file and nothing else. Deliberately does
 * NOT use Supabase Storage - see decision D9 in the planning doc.
 *
 * Must not import from next/* (decision D1).
 *
 * Layout on disk:
 *   <UPLOAD_ROOT>/2026/08/<uuid>.pdf
 *
 * The stored name is always a generated uuid, never the uploader's filename, so a
 * path cannot be guessed and two uploads can never collide. The original name is
 * kept in the database instead.
 */

/**
 * turbopackIgnore: the upload root comes from an environment variable, so the
 * bundler cannot resolve it statically. Without this it assumes the path could
 * be anything, traces the entire project as a possible dependency, and copies
 * the whole source tree - public folder included - into the deployment output.
 */
const UPLOAD_ROOT = path.resolve(
  /* turbopackIgnore: true */ process.env.UPLOAD_ROOT ?? "./storage/uploads"
)

export type StoredFile = {
  /** Path relative to UPLOAD_ROOT. Goes in Document.storageKey. */
  storageKey: string
  sizeBytes: number
  checksum: string
}

/**
 * Refuses any key that would escape the upload root. Called on every read and
 * delete, because storageKey ultimately reaches us from a database row and a
 * database row is not a trust boundary.
 */
function resolveWithinRoot(storageKey: string): string {
  const resolved = path.resolve(UPLOAD_ROOT, storageKey)
  const rootWithSep = UPLOAD_ROOT.endsWith(path.sep)
    ? UPLOAD_ROOT
    : UPLOAD_ROOT + path.sep

  if (resolved !== UPLOAD_ROOT && !resolved.startsWith(rootWithSep)) {
    throw new Error(`Refusing to access a path outside the upload root: ${storageKey}`)
  }
  return resolved
}

function extensionFor(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase()
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : ""
}

export async function putFile(
  bytes: Buffer,
  originalName: string
): Promise<StoredFile> {
  const now = new Date()
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")

  const storageKey = path.posix.join(
    year,
    month,
    `${randomUUID()}${extensionFor(originalName)}`
  )
  const destination = resolveWithinRoot(storageKey)

  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, bytes, { flag: "wx" })

  return {
    storageKey,
    sizeBytes: bytes.byteLength,
    checksum: createHash("sha256").update(bytes).digest("hex"),
  }
}

/** Streams a stored file. The caller is responsible for checking permissions first. */
export function readFileStream(storageKey: string) {
  return createReadStream(resolveWithinRoot(storageKey))
}

export async function fileExists(storageKey: string): Promise<boolean> {
  try {
    const info = await stat(resolveWithinRoot(storageKey))
    return info.isFile()
  } catch {
    return false
  }
}

/**
 * Physically removes a file. Note that the application's delete flow is a SOFT
 * delete - it sets Document.deletedAt and leaves the bytes alone. This exists for
 * cleanup jobs and for rolling back a failed upload, not for the delete button.
 */
export async function hardDeleteFile(storageKey: string): Promise<void> {
  await rm(resolveWithinRoot(storageKey), { force: true })
}

export function getUploadRoot(): string {
  return UPLOAD_ROOT
}
