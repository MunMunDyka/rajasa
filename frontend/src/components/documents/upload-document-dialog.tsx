"use client"

import { FileUp, Loader2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { FormEvent, useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { UploadCategory } from "@/server/services/document-service"

type OutstandingRequirement = {
  id: string
  label: string
}

export function UploadDocumentDialog({
  projectId,
  projectName,
  categories,
  requirements,
  maxUploadBytes,
}: {
  projectId: string
  projectName: string
  categories: UploadCategory[]
  requirements: OutstandingRequirement[]
  maxUploadBytes: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [documentName, setDocumentName] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const defaultCategoryId =
    categories.find((category) => category.key === "OTHER")?.id ?? categories[0]?.id

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return
    setOpen(nextOpen)
    if (nextOpen) setError(null)
  }

  function handleFileChange(file: File | null) {
    setSelectedFile(file)
    setError(null)
    if (file) {
      setDocumentName(file.name.replace(/\.[^.]+$/, ""))
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setError(null)

    startTransition(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/documents`, {
          method: "POST",
          body: formData,
        })
        const payload = (await response.json()) as { message?: string }

        if (!response.ok) {
          throw new Error(payload.message || "Dokumen gagal diunggah.")
        }

        toast.success("Dokumen berhasil diunggah.")
        form.reset()
        setDocumentName("")
        setSelectedFile(null)
        setOpen(false)
        router.refresh()
      } catch (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Dokumen gagal diunggah."
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={categories.length === 0}>
          <Upload className="size-4" />
          Upload Dokumen
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Dokumen</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {projectName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document-file">File</Label>
            <div className="rounded-lg border border-dashed bg-muted/25 p-3">
              <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                <FileUp className="size-4" />
                <span className="truncate">
                  {selectedFile?.name ?? "PDF atau gambar"}
                </span>
              </div>
              <Input
                id="document-file"
                name="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                required
                disabled={isPending}
                className="h-10 bg-background py-1.5"
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Maksimal {Math.floor(maxUploadBytes / 1024 / 1024)} MB.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-name">Nama dokumen</Label>
            <Input
              id="document-name"
              name="name"
              value={documentName}
              onChange={(event) => setDocumentName(event.target.value)}
              maxLength={160}
              required
              disabled={isPending}
              placeholder="Contoh: Kontrak kerja proyek"
            />
          </div>

          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select name="categoryId" defaultValue={defaultCategoryId} disabled={isPending}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requirements.length > 0 ? (
            <div className="space-y-2">
              <Label>Penuhi kebutuhan dokumen</Label>
              <Select name="requirementId" defaultValue="__none__" disabled={isPending}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tidak dikaitkan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Tidak dikaitkan</SelectItem>
                  {requirements.map((requirement) => (
                    <SelectItem key={requirement.id} value={requirement.id}>
                      {requirement.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || !selectedFile || !defaultCategoryId}>
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Mengunggah...
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
