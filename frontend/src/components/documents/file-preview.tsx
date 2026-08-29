"use client"

import { ExternalLink, Eye, FileText, ImageIcon } from "lucide-react"
import Image from "next/image"

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
  const fileUrl = `/api/files/${file.id}`
  const isImage = file.mimeType.startsWith("image/")
  const isPdf = file.mimeType === "application/pdf"

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={compact ? "xs" : "sm"}
          className={className}
        >
          <Eye className="size-3.5" />
          <span className="max-w-48 truncate">{label}</span>
        </Button>
      </DialogTrigger>

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
