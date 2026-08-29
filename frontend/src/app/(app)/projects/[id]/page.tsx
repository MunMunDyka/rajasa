import {
  ArrowLeft,
  Building2,
  CalendarRange,
  CircleDollarSign,
  FileCheck2,
  Files,
  History,
  LayoutList,
  MapPin,
  Ship,
  TrendingUp,
  UsersRound,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { DocumentList } from "@/components/documents/document-list"
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog"
import { EmptyState } from "@/components/layout/page-header"
import {
  DelayedBadge,
  DocumentsBadge,
  StatusBadge,
} from "@/components/projects/project-badges"
import { ProgressTimeline } from "@/components/projects/progress-timeline"
import { RequirementChecklist } from "@/components/projects/requirement-checklist"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MAX_UPLOAD_BYTES } from "@/config/app"
import { formatCurrency, formatDate, formatRelative, initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  canSeeFinancials,
  canUploadProjectDocument,
  requireUser,
} from "@/server/auth/guards"
import { listRecentActivity } from "@/server/services/activity-service"
import {
  listDocuments,
  listUploadCategories,
} from "@/server/services/document-service"
import { listProgress } from "@/server/services/progress-service"
import { getProject } from "@/server/services/project-service"
import { listRequirements, summarise } from "@/server/services/requirement-service"

export async function generateMetadata({
  params,
}: PageProps<"/projects/[id]">): Promise<Metadata> {
  const user = await requireUser()
  const { id } = await params
  const project = await getProject({ id: user.id, role: user.role }, id)
  return { title: project?.name ?? "Proyek" }
}

function DetailField({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  )
}

export default async function ProjectDetailPage({
  params,
}: PageProps<"/projects/[id]">) {
  const user = await requireUser()
  const viewer = { id: user.id, role: user.role }
  const { id } = await params
  const project = await getProject(viewer, id)

  if (!project) notFound()

  const mayUploadDocument = canUploadProjectDocument(user.role)
  const [documents, progress, requirements, activity, uploadCategories] = await Promise.all([
    listDocuments(viewer, { projectId: project.id }),
    listProgress(project.id),
    listRequirements(project.id),
    listRecentActivity(viewer, 30),
    mayUploadDocument ? listUploadCategories(viewer) : Promise.resolve([]),
  ])

  const requirementSummary = summarise(requirements)
  const projectActivity = activity.filter(
    (item) => item.project?.id === project.id
  )
  const projectDocuments = documents.filter(
    (document) => document.kind === "PROJECT_DOCUMENT"
  )
  const clampedProgress = Math.min(100, Math.max(0, project.currentProgress))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/projects">
            <ArrowLeft className="size-4" />
            Daftar proyek
          </Link>
        </Button>

        {mayUploadDocument && uploadCategories.length > 0 ? (
          <UploadDocumentDialog
            projectId={project.id}
            projectName={project.name}
            categories={uploadCategories}
            requirements={requirements
              .filter((requirement) => requirement.status !== "FULFILLED")
              .map((requirement) => ({ id: requirement.id, label: requirement.label }))}
            maxUploadBytes={MAX_UPLOAD_BYTES}
          />
        ) : null}
      </div>

      <section className="overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={project.status} />
              {project.flags.delayed ? <DelayedBadge /> : null}
              <DocumentsBadge {...project.documents} />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-brand-maroon">{project.code}</p>
              <h1 className="max-w-4xl text-2xl leading-tight font-semibold text-brand-navy sm:text-3xl">
                {project.name}
              </h1>
              {project.clientName ? (
                <p className="text-sm text-muted-foreground">{project.clientName}</p>
              ) : null}
            </div>

            {project.description ? (
              <p className="max-w-4xl text-sm leading-relaxed text-foreground/75">
                {project.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col justify-center bg-brand-navy p-5 text-white sm:p-6">
            <p className="text-xs font-medium text-white/65">Progress saat ini</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-4xl leading-none font-semibold tabular-nums">
                {clampedProgress}%
              </p>
              <TrendingUp className="size-5 text-white/60" />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-white/60">
              {project.lastProgressAt
                ? `Diperbarui ${formatRelative(project.lastProgressAt)}`
                : "Belum ada pembaruan progress"}
            </p>
          </div>
        </div>

        <div className="grid gap-5 border-t px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <DetailField icon={Ship} label="Kapal">
            {project.vesselName ?? "-"}
          </DetailField>
          <DetailField icon={MapPin} label="Lokasi">
            {project.location ?? "-"}
          </DetailField>
          <DetailField icon={CalendarRange} label="Periode">
            <span className="whitespace-normal">
              {formatDate(project.startDate)} - {formatDate(project.targetDate)}
            </span>
          </DetailField>
          <DetailField icon={UsersRound} label="PIC">
            {project.pic?.name ?? "Belum ditentukan"}
          </DetailField>
        </div>
      </section>

      <Tabs defaultValue="overview" className="gap-0">
        {/* Segmented control rather than an underline.
            The underline variant marked the active tab with a 2px rule and a
            slight change in text colour, which was easy to miss - especially on
            the first visit, when nothing has been clicked yet. A filled pill
            with white text on navy cannot be mistaken. */}
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg bg-muted p-1">
          {[
            { value: "overview", label: "Ringkasan", icon: LayoutList },
            { value: "progress", label: "Progress", icon: TrendingUp },
            { value: "documents", label: "Dokumen", icon: Files },
            { value: "activity", label: "Aktivitas", icon: History },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "h-9 flex-1 gap-1.5 rounded-md px-2 text-xs font-medium sm:px-4 sm:text-sm",
                "text-muted-foreground hover:text-foreground",
                "data-active:bg-brand-navy data-active:text-white data-active:shadow-sm",
                "data-active:hover:text-white"
              )}
            >
              <tab.icon className="hidden size-4 sm:block" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.5fr)]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Informasi Proyek</CardTitle>
                <CardDescription>Data utama pelaksanaan dan administrasi proyek.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <DetailField icon={Building2} label="Klien">
                  {project.clientName ?? "-"}
                </DetailField>
                <DetailField icon={FileCheck2} label="Kode proyek">
                  {project.code}
                </DetailField>
                <DetailField icon={CalendarRange} label="Tanggal mulai">
                  {formatDate(project.startDate)}
                </DetailField>
                <DetailField icon={CalendarRange} label="Target selesai">
                  {formatDate(project.targetDate)}
                </DetailField>
                {canSeeFinancials(user.role) ? (
                  <DetailField icon={CircleDollarSign} label="Nilai kontrak">
                    {formatCurrency(project.contractValue)}
                  </DetailField>
                ) : null}
                {project.completedAt ? (
                  <DetailField icon={FileCheck2} label="Diselesaikan">
                    {formatDate(project.completedAt)}
                  </DetailField>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle>Tim Proyek</CardTitle>
                <CardDescription>{project.members.length} anggota ditugaskan.</CardDescription>
              </CardHeader>
              <CardContent>
                {project.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada anggota tim yang ditugaskan.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {project.members.map((member) => (
                      <li key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-brand-navy/9 text-xs font-semibold text-brand-navy">
                            {initials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{member.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.role === "PIC" ? "PIC / " : ""}
                            {member.position ?? "Anggota tim"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <RequirementChecklist items={requirements} summary={requirementSummary} />
        </TabsContent>

        <TabsContent value="progress" className="mt-5">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Riwayat Progress</CardTitle>
              <CardDescription>
                Perubahan progress, catatan engineer, dan bukti pekerjaan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressTimeline entries={progress} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-5 space-y-4">
          <RequirementChecklist items={requirements} summary={requirementSummary} />

          <Card className="py-0">
            <CardContent className="px-0">
              <DocumentList
                documents={projectDocuments}
                showProject={false}
                emptyTitle="Belum ada dokumen proyek"
                emptyDescription="Dokumen yang diunggah untuk proyek ini akan tampil di sini."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-5">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Riwayat Aktivitas</CardTitle>
              <CardDescription>Jejak perubahan pada proyek ini.</CardDescription>
            </CardHeader>
            <CardContent>
              {projectActivity.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Belum ada aktivitas"
                  description="Perubahan progress dan unggahan dokumen akan tercatat di sini."
                />
              ) : (
                <ol className="divide-y">
                  {projectActivity.map((item) => (
                    <li key={item.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-maroon" />
                      <div className="min-w-0">
                        <p className="text-sm leading-relaxed">
                          <span className="font-semibold">{item.actor.name}</span>{" "}
                          <span className="text-muted-foreground">{item.summary}</span>
                        </p>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {formatRelative(item.createdAt)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
