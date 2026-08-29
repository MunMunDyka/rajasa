"use client"

import { ExternalLink, Eye, FileText, ImageIcon } from "lucide-react"
import Image from "next/image"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type PreviewFile = {
  id: string
  name: string
  originalName: string
  mimeType: string
  sizeBytes: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileThumbnail({
  file,
  className,
}: {
  file: PreviewFile
  className?: string
}) {
  const isImage = file.mimeType.startsWith("image/")

  return (
    <span
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/60",
        className
      )}
    >
      {isImage ? (
        <Image
          src={`/api/files/${file.id}`}
          alt=""
          fill
          sizes="44px"
          unoptimized
          className="object-cover"
        />
      ) : (
        <FileText className="size-5 text-brand-maroon" />
      )}
    </span>
  )
}

/**
 * The preview dialog, with the trigger left to the caller.
 *
 * Splitting it this way is what lets the thumbnail open the preview: a document
 * row no longer needs a separate action column whose only job is to repeat what
 * clicking the file itself should already do.
 */
export function FilePreview({
  file,
  children,
}: {
  file: PreviewFile
  children: ReactNode
}) {
  const fileUrl = `/api/files/${file.id}`
  const isImage = file.mimeType.startsWith("image/")
  const isPdf = file.mimeType === "application/pdf"

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="grid h-[90vh] max-h-[920px] w-[calc(100vw-1rem)] max-w-6xl grid-rows-[auto_minmax(240px,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="border-b px-5 py-4 pr-14">
          <DialogTitle className="truncate text-brand-navy">{file.name}</DialogTitle>
          <DialogDescription className="truncate">
            {file.originalName} / {formatBytes(file.sizeBytes)}
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-h-0 overflow-hidden bg-[#e9edf1]">
          {isImage ? (
            <Image
              src={fileUrl}
              alt={file.name}
              fill
              sizes="(max-width: 768px) 100vw, 1100px"
              unoptimized
              className="object-contain p-3 sm:p-5"
            />
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              title={`Preview ${file.name}`}
              className="size-full border-0 bg-white"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3 p-8 text-center">
              <ImageIcon className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Format ini tidak dapat ditampilkan langsung.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 flex-row justify-end rounded-none border-t bg-card px-4 py-3">
          <Button asChild variant="outline" size="sm">
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              Buka di tab baru
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Clickable thumbnail. Carries a visible hover state and an aria-label, because
 * an image that silently happens to be a button is a control nobody finds.
 */
export function FileThumbnailButton({
  file,
  className,
}: {
  file: PreviewFile
  className?: string
}) {
  return (
    <FilePreview file={file}>
      <button
        type="button"
        aria-label={`Pratinjau ${file.name}`}
        title={`Pratinjau ${file.name}`}
        className={cn(
          "group relative shrink-0 cursor-pointer rounded-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
      >
        <FileThumbnail file={file} className="transition-opacity group-hover:opacity-70" />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-brand-navy/0 opacity-0 transition-all group-hover:bg-brand-navy/35 group-hover:opacity-100">
          <Eye className="size-4 text-white" />
        </span>
      </button>
    </FilePreview>
  )
}

/** Button-shaped trigger, still used by the progress timeline's evidence chips. */
export function FilePreviewButton({
  file,
  compact = false,
  label = "Preview",
  className,
}: {
  file: PreviewFile
  compact?: boolean
  label?: string
  className?: string
}) {
  return (
    <FilePreview file={file}>
      <Button
        type="button"
        variant="outline"
        size={compact ? "xs" : "sm"}
        className={className}
      >
        <Eye className="size-3.5" />
        <span className="max-w-48 truncate">{label}</span>
      </Button>
    </FilePreview>
  )
}
