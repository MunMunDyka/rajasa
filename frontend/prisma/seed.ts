import "dotenv/config"

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

import { DOCUMENT_CATEGORIES } from "../src/config/document-categories"
import { DEFAULT_REQUIREMENT_TEMPLATE } from "../src/config/requirement-templates"
import { putFile } from "../src/server/storage"
import { NAVY, SAND, STEEL, makePdf, makePng } from "./seed-assets"

/**
 * Demo seed.
 *
 * Wipes and rebuilds the demo dataset, so it is safe to re-run right before a
 * client demo to get back to a clean state.
 *
 * Guarded by DEMO_MODE: it refuses to run when DEMO_MODE is not "true", so it can
 * never wipe the production database after go-live.
 */

if (process.env.DEMO_MODE !== "true") {
  console.error(
    "Refusing to seed: DEMO_MODE is not \"true\".\n" +
      "This script deletes every row. If you really mean to seed a non-demo\n" +
      "database, set DEMO_MODE=true temporarily and understand what you are doing."
  )
  process.exit(1)
}

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DIRECT_URL / DATABASE_URL is not set. Fill in .env first.")
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

const DEMO_PASSWORD = "demo1234"

/** Anchor every relative date to one moment so re-runs stay consistent. */
const TODAY = new Date()

function daysAgo(days: number): Date {
  const date = new Date(TODAY)
  date.setDate(date.getDate() - days)

  // Spread the clock time across a working day. Every row used to be pinned to
  // 09:00, which was invisible until the activity feed started showing the
  // hour - then the whole feed read as a wall of identical timestamps.
  // Derived from the day offset rather than random, so re-running the seed
  // produces the same data.
  const key = Math.abs(days)
  date.setHours(8 + ((key * 7) % 9), (key * 17) % 60, 0, 0)
  return date
}

function daysAhead(days: number): Date {
  return daysAgo(-days)
}

async function main() {
  console.log("Clearing existing data...")
  // Order matters: children before parents.
  await prisma.activityLog.deleteMany()
  await prisma.documentRequirement.deleteMany()
  await prisma.document.deleteMany()
  await prisma.progressUpdate.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.documentCategory.deleteMany()
  await prisma.user.deleteMany()
  await prisma.appSetting.deleteMany()

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------
  console.log("Seeding document categories...")
  await prisma.documentCategory.createMany({
    data: DOCUMENT_CATEGORIES.map((category) => ({
      key: category.key,
      label: category.label,
      group: category.group,
      sortOrder: category.sortOrder,
    })),
  })

  const categories = await prisma.documentCategory.findMany()
  const categoryId = (key: string) => {
    const found = categories.find((category) => category.key === key)
    if (!found) throw new Error(`Unknown category key: ${key}`)
    return found.id
  }

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  console.log("Seeding users...")
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  const [admin, ceo, budi, andi, siti] = await Promise.all(
    [
      { name: "Admin Sistem", email: "admin@demo.local", role: "ADMIN" as const, position: "IT Administrator" },
      { name: "Hendra Kusuma", email: "ceo@demo.local", role: "CEO" as const, position: "Direktur Utama" },
      { name: "Budi Santoso", email: "engineer@demo.local", role: "ENGINEER" as const, position: "Marine Engineer" },
      { name: "Andi Wijaya", email: "engineer2@demo.local", role: "ENGINEER" as const, position: "Electrical Engineer" },
      { name: "Siti Rahma", email: "accountant@demo.local", role: "ACCOUNTANT" as const, position: "Finance Staff" },
    ].map((user) =>
      prisma.user.create({
        data: { ...user, passwordHash, isDemo: true },
      })
    )
  )

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Writes a real file to disk and returns the row data for a Document. */
  async function storePdf(title: string, lines: string[], fileName: string) {
    const stored = await putFile(makePdf(title, lines), fileName)
    return { ...stored, originalName: fileName, mimeType: "application/pdf" }
  }

  async function storePhoto(fileName: string, base: [number, number, number]) {
    const stored = await putFile(makePng(1024, 768, base, SAND), fileName)
    return { ...stored, originalName: fileName, mimeType: "image/png" }
  }

  async function seedRequirements(projectId: string, startDate: Date) {
    for (const item of DEFAULT_REQUIREMENT_TEMPLATE) {
      await prisma.documentRequirement.create({
        data: {
          projectId,
          label: item.label,
          categoryId: item.categoryKey ? categoryId(item.categoryKey) : null,
          isMandatory: item.isMandatory,
          sortOrder: item.sortOrder,
          dueDate:
            item.dueAfterDays === null
              ? null
              : new Date(startDate.getTime() + item.dueAfterDays * 86_400_000),
        },
      })
    }
  }

  /** Links an uploaded document to the requirement it satisfies. */
  async function fulfilRequirement(
    projectId: string,
    label: string,
    documentId: string,
    when: Date
  ) {
    await prisma.documentRequirement.update({
      where: { projectId_label: { projectId, label } },
      data: { fulfilledById: documentId, fulfilledAt: when },
    })
  }

  async function logActivity(data: {
    projectId?: string
    actorId: string
    action: Parameters<typeof prisma.activityLog.create>[0]["data"]["action"]
    summary: string
    metadata?: object
    targetType?: string
    targetId?: string
    createdAt: Date
  }) {
    await prisma.activityLog.create({
      data: {
        projectId: data.projectId ?? null,
        actorId: data.actorId,
        action: data.action,
        summary: data.summary,
        metadata: data.metadata ?? undefined,
        targetType: data.targetType ?? null,
        targetId: data.targetId ?? null,
        createdAt: data.createdAt,
      },
    })
  }

  // =========================================================================
  // PROJECT 1 - fully detailed. This is the one the demo script opens.
  // =========================================================================
  console.log("Seeding project 1 (MV Rajasa Engine Maintenance)...")

  const project1 = await prisma.project.create({
    data: {
      code: "RKL-2026-011",
      name: "MV Rajasa Engine Maintenance",
      description:
        "Overhaul mesin induk dan perawatan berkala ruang mesin MV Rajasa. " +
        "Mencakup penggantian komponen aus, inspeksi sistem pendingin, dan uji fungsi sebelum kapal kembali beroperasi.",
      status: "IN_PROGRESS",
      clientName: "PT Samudra Nusantara Line",
      location: "Pelabuhan Tanjung Priok, Jakarta",
      vesselName: "MV Rajasa",
      contractValue: "1850000000",
      startDate: daysAgo(58),
      targetDate: daysAhead(32),
      currentProgress: 65,
      lastProgressAt: daysAgo(3),
      createdById: admin.id,
    },
  })

  await prisma.projectMember.createMany({
    data: [
      { projectId: project1.id, userId: budi.id, role: "PIC", assignedAt: daysAgo(58) },
      { projectId: project1.id, userId: andi.id, role: "MEMBER", assignedAt: daysAgo(50) },
    ],
  })

  await seedRequirements(project1.id, daysAgo(58))

  // --- progress history -----------------------------------------------------
  const progress1 = [
    {
      previousProgress: 0,
      progress: 15,
      description:
        "Kapal sandar di dermaga. Pemeriksaan awal ruang mesin selesai, daftar komponen yang perlu diganti sudah disusun.",
      reportedAt: daysAgo(52),
    },
    {
      previousProgress: 15,
      progress: 30,
      description: "Material dan spare part utama tiba di lokasi. Verifikasi kelengkapan terhadap PO selesai.",
      reportedAt: daysAgo(41),
    },
    {
      previousProgress: 30,
      progress: 50,
      description:
        "Proses penggantian komponen dimulai. Piston dan liner silinder nomor 1 sampai 3 sudah terpasang.",
      reportedAt: daysAgo(19),
    },
    {
      previousProgress: 50,
      progress: 65,
      description:
        "Inspeksi ruang mesin selesai. Sistem pendingin diuji tanpa kebocoran. Menunggu jadwal uji fungsi menyeluruh.",
      reportedAt: daysAgo(3),
    },
  ]

  const createdProgress1 = []
  for (const entry of progress1) {
    const record = await prisma.progressUpdate.create({
      data: { ...entry, projectId: project1.id, authorId: budi.id, createdAt: entry.reportedAt },
    })
    createdProgress1.push(record)
    await logActivity({
      projectId: project1.id,
      actorId: budi.id,
      action: "PROGRESS_UPDATED",
      summary: `memperbarui progress proyek ${entry.previousProgress}% ke ${entry.progress}%`,
      metadata: { from: entry.previousProgress, to: entry.progress },
      targetType: "ProgressUpdate",
      targetId: record.id,
      createdAt: entry.reportedAt,
    })
  }

  // --- progress evidence (engineer uploads) --------------------------------
  const evidence1 = await storePhoto("inspeksi-ruang-mesin.png", NAVY)
  const evidenceDoc1 = await prisma.document.create({
    data: {
      projectId: project1.id,
      kind: "PROGRESS_EVIDENCE",
      categoryId: categoryId("PROGRESS_EVIDENCE"),
      progressUpdateId: createdProgress1[3].id,
      name: "Foto inspeksi ruang mesin",
      uploadedById: budi.id,
      uploadedAt: daysAgo(3),
      ...evidence1,
    },
  })

  const evidence1b = await storePdf(
    "Laporan Inspeksi Ruang Mesin",
    [
      "Proyek   : MV Rajasa Engine Maintenance",
      "Kode     : RKL-2026-011",
      "Kapal    : MV Rajasa",
      "Pelaksana: Budi Santoso - Marine Engineer",
      "",
      "Ringkasan hasil inspeksi:",
      "- Sistem pendingin diuji, tidak ditemukan kebocoran.",
      "- Piston dan liner silinder 1-3 terpasang sesuai spesifikasi.",
      "- Tekanan oli pelumas dalam batas normal.",
      "- Rekomendasi: lanjut ke uji fungsi menyeluruh.",
    ],
    "laporan-inspeksi-ruang-mesin.pdf"
  )
  await prisma.document.create({
    data: {
      projectId: project1.id,
      kind: "PROGRESS_EVIDENCE",
      categoryId: categoryId("PROGRESS_EVIDENCE"),
      progressUpdateId: createdProgress1[3].id,
      name: "Laporan inspeksi ruang mesin",
      uploadedById: budi.id,
      uploadedAt: daysAgo(3),
      ...evidence1b,
    },
  })

  await logActivity({
    projectId: project1.id,
    actorId: budi.id,
    action: "DOCUMENT_UPLOADED",
    summary: "mengunggah bukti progress inspeksi-ruang-mesin.png",
    targetType: "Document",
    targetId: evidenceDoc1.id,
    createdAt: daysAgo(3),
  })

  // --- project documents (CEO / accountant uploads) ------------------------
  const documents1: Array<{
    label: string
    categoryKey: string
    name: string
    fileName: string
    lines: string[]
    uploader: typeof ceo
    when: Date
    documentNumber?: string
  }> = [
    {
      label: "Kontrak Kerja",
      categoryKey: "CONTRACT",
      name: "Kontrak Kerja - Samudra Nusantara Line",
      fileName: "kontrak-kerja-rkl-2026-011.pdf",
      documentNumber: "KTR/RKL/2026/011",
      lines: [
        "Nomor    : KTR/RKL/2026/011",
        "Para pihak: PT Rajasa Kemenangan Logistik",
        "           PT Samudra Nusantara Line",
        "Objek    : Overhaul mesin induk MV Rajasa",
        "Nilai    : Rp 1.850.000.000",
      ],
      uploader: ceo,
      when: daysAgo(57),
    },
    {
      label: "Surat Perintah Kerja (SPK)",
      categoryKey: "WORK_ORDER",
      name: "SPK Overhaul Mesin Induk",
      fileName: "spk-rkl-2026-011.pdf",
      documentNumber: "SPK/RKL/2026/034",
      lines: [
        "Nomor  : SPK/RKL/2026/034",
        "Perihal: Perintah pelaksanaan overhaul mesin induk",
        "Kepada : Tim Teknis - Budi Santoso",
        "Lokasi : Pelabuhan Tanjung Priok, Jakarta",
      ],
      uploader: admin,
      when: daysAgo(56),
    },
    {
      label: "Purchase Order",
      categoryKey: "PURCHASE_ORDER",
      name: "PO Spare Part Mesin Induk",
      fileName: "po-spare-part-011.pdf",
      documentNumber: "PO/RKL/2026/087",
      lines: [
        "Nomor   : PO/RKL/2026/087",
        "Supplier: PT Marine Parts Indonesia",
        "Item    : Piston, liner silinder, gasket set",
        "Total   : Rp 640.000.000",
      ],
      uploader: siti,
      when: daysAgo(45),
    },
    {
      label: "Laporan Inspeksi Awal",
      categoryKey: "REPORT",
      name: "Laporan Inspeksi Awal Ruang Mesin",
      fileName: "laporan-inspeksi-awal-011.pdf",
      lines: [
        "Proyek : MV Rajasa Engine Maintenance",
        "Tanggal: pemeriksaan awal sebelum pekerjaan dimulai",
        "",
        "Temuan: keausan pada liner silinder 1-3,",
        "kebocoran ringan pada sambungan sistem pendingin.",
      ],
      uploader: budi,
      when: daysAgo(52),
    },
    {
      label: "Invoice Termin 1",
      categoryKey: "INVOICE",
      name: "Invoice Termin 1",
      fileName: "invoice-termin-1-011.pdf",
      documentNumber: "INV/RKL/2026/118",
      lines: [
        "Nomor : INV/RKL/2026/118",
        "Kepada: PT Samudra Nusantara Line",
        "Termin: 1 dari 3 (40%)",
        "Jumlah: Rp 740.000.000",
      ],
      uploader: siti,
      when: daysAgo(38),
    },
  ]

  for (const item of documents1) {
    const stored = await storePdf(item.name, item.lines, item.fileName)
    const document = await prisma.document.create({
      data: {
        projectId: project1.id,
        kind: "PROJECT_DOCUMENT",
        categoryId: categoryId(item.categoryKey),
        name: item.name,
        documentNumber: item.documentNumber ?? null,
        documentDate: item.when,
        uploadedById: item.uploader.id,
        uploadedAt: item.when,
        ...stored,
      },
    })
    await fulfilRequirement(project1.id, item.label, document.id, item.when)
    await logActivity({
      projectId: project1.id,
      actorId: item.uploader.id,
      action: "DOCUMENT_UPLOADED",
      summary: `mengunggah dokumen ${item.name}`,
      targetType: "Document",
      targetId: document.id,
      createdAt: item.when,
    })
  }
  // Leaves BAST outstanding -> 5 of 6 mandatory requirements fulfilled.

  // =========================================================================
  // PROJECT 2 - detailed, and deliberately behind schedule
  // =========================================================================
  console.log("Seeding project 2 (Docking Preparation MV Sinar Timur)...")

  const project2 = await prisma.project.create({
    data: {
      code: "RKL-2026-014",
      name: "Docking Preparation MV Sinar Timur",
      description:
        "Persiapan docking tahunan MV Sinar Timur: pembersihan lambung, pengecatan ulang, " +
        "dan pemeriksaan sistem propulsi sesuai jadwal klasifikasi.",
      status: "IN_PROGRESS",
      clientName: "PT Bahari Timur Shipping",
      location: "Galangan Kapal Cilincing, Jakarta",
      vesselName: "MV Sinar Timur",
      contractValue: "980000000",
      startDate: daysAgo(74),
      targetDate: daysAgo(6), // overdue -> the dashboard "requires attention" case
      currentProgress: 40,
      lastProgressAt: daysAgo(28),
      createdById: admin.id,
    },
  })

  await prisma.projectMember.create({
    data: { projectId: project2.id, userId: andi.id, role: "PIC", assignedAt: daysAgo(74) },
  })

  await seedRequirements(project2.id, daysAgo(74))

  const progress2 = [
    {
      previousProgress: 0,
      progress: 20,
      description: "Kapal masuk galangan. Pembersihan lambung bagian bawah garis air selesai.",
      reportedAt: daysAgo(60),
    },
    {
      previousProgress: 20,
      progress: 40,
      description:
        "Pengecatan lapis pertama selesai. Pemeriksaan sistem propulsi tertunda menunggu kedatangan suku cadang.",
      reportedAt: daysAgo(28),
    },
  ]

  for (const entry of progress2) {
    const record = await prisma.progressUpdate.create({
      data: { ...entry, projectId: project2.id, authorId: andi.id, createdAt: entry.reportedAt },
    })
    await logActivity({
      projectId: project2.id,
      actorId: andi.id,
      action: "PROGRESS_UPDATED",
      summary: `memperbarui progress proyek ${entry.previousProgress}% ke ${entry.progress}%`,
      metadata: { from: entry.previousProgress, to: entry.progress },
      targetType: "ProgressUpdate",
      targetId: record.id,
      createdAt: entry.reportedAt,
    })
  }

  const hullPhoto = await storePhoto("pengecatan-lambung.png", STEEL)
  await prisma.document.create({
    data: {
      projectId: project2.id,
      kind: "PROGRESS_EVIDENCE",
      categoryId: categoryId("PROGRESS_EVIDENCE"),
      progressUpdateId: (await prisma.progressUpdate.findFirstOrThrow({
        where: { projectId: project2.id },
        orderBy: { reportedAt: "desc" },
      })).id,
      name: "Foto pengecatan lambung",
      uploadedById: andi.id,
      uploadedAt: daysAgo(28),
      ...hullPhoto,
    },
  })

  const contract2 = await storePdf(
    "Kontrak Kerja - Bahari Timur Shipping",
    [
      "Nomor    : KTR/RKL/2026/014",
      "Para pihak: PT Rajasa Kemenangan Logistik",
      "           PT Bahari Timur Shipping",
      "Objek    : Persiapan docking tahunan MV Sinar Timur",
      "Nilai    : Rp 980.000.000",
    ],
    "kontrak-kerja-rkl-2026-014.pdf"
  )
  const contract2Doc = await prisma.document.create({
    data: {
      projectId: project2.id,
      kind: "PROJECT_DOCUMENT",
      categoryId: categoryId("CONTRACT"),
      name: "Kontrak Kerja - Bahari Timur Shipping",
      documentNumber: "KTR/RKL/2026/014",
      documentDate: daysAgo(73),
      uploadedById: ceo.id,
      uploadedAt: daysAgo(73),
      ...contract2,
    },
  })
  await fulfilRequirement(project2.id, "Kontrak Kerja", contract2Doc.id, daysAgo(73))

  const po2 = await storePdf(
    "PO Cat Marine dan Material Docking",
    [
      "Nomor   : PO/RKL/2026/094",
      "Supplier: PT Cipta Marine Coating",
      "Item    : Cat anti fouling, primer, thinner",
      "Total   : Rp 210.000.000",
    ],
    "po-material-docking-014.pdf"
  )
  const po2Doc = await prisma.document.create({
    data: {
      projectId: project2.id,
      kind: "PROJECT_DOCUMENT",
      categoryId: categoryId("PURCHASE_ORDER"),
      name: "PO Cat Marine dan Material Docking",
      documentNumber: "PO/RKL/2026/094",
      documentDate: daysAgo(66),
      uploadedById: siti.id,
      uploadedAt: daysAgo(66),
      ...po2,
    },
  })
  await fulfilRequirement(project2.id, "Purchase Order", po2Doc.id, daysAgo(66))
  // 2 of 6 mandatory -> shows up clearly as incomplete on the dashboard.

  // =========================================================================
  // Thin projects - enough for the list and the dashboard counters to look real
  // =========================================================================
  console.log("Seeding supporting projects...")

  const thinProjects = [
    {
      code: "RKL-2026-009",
      name: "Marine Equipment Inspection",
      description: "Inspeksi berkala peralatan keselamatan dan navigasi armada.",
      status: "COMPLETED" as const,
      clientName: "PT Samudra Nusantara Line",
      location: "Pelabuhan Tanjung Priok, Jakarta",
      vesselName: "MV Rajasa",
      startDate: daysAgo(150),
      targetDate: daysAgo(96),
      completedAt: daysAgo(98),
      currentProgress: 100,
      lastProgressAt: daysAgo(98),
      pic: budi,
    },
    {
      code: "RKL-2026-012",
      name: "Port Logistics Support",
      description: "Dukungan operasional bongkar muat dan pergudangan di terminal.",
      status: "IN_PROGRESS" as const,
      clientName: "PT Terminal Petikemas Jaya",
      location: "Terminal Petikemas, Jakarta",
      vesselName: null,
      startDate: daysAgo(34),
      targetDate: daysAhead(60),
      completedAt: null,
      currentProgress: 25,
      lastProgressAt: daysAgo(11),
      pic: andi,
    },
    {
      code: "RKL-2026-015",
      name: "Vessel Electrical Maintenance",
      description: "Perawatan sistem kelistrikan dan panel distribusi kapal.",
      status: "PLANNING" as const,
      clientName: "PT Bahari Timur Shipping",
      location: "Galangan Kapal Cilincing, Jakarta",
      vesselName: "MV Sinar Timur",
      startDate: daysAhead(9),
      targetDate: daysAhead(85),
      completedAt: null,
      currentProgress: 0,
      lastProgressAt: null,
      pic: andi,
    },
    {
      code: "RKL-2026-016",
      name: "Safety Equipment Replacement",
      description: "Penggantian life raft, life jacket, dan alat pemadam kebakaran.",
      status: "ON_HOLD" as const,
      clientName: "PT Samudra Nusantara Line",
      location: "Pelabuhan Tanjung Priok, Jakarta",
      vesselName: "MV Rajasa",
      startDate: daysAgo(21),
      targetDate: daysAhead(11),
      completedAt: null,
      currentProgress: 10,
      lastProgressAt: daysAgo(17),
      pic: budi,
    },
  ]

  for (const item of thinProjects) {
    const { pic, ...data } = item
    const project = await prisma.project.create({
      data: { ...data, createdById: admin.id },
    })
    await prisma.projectMember.create({
      data: { projectId: project.id, userId: pic.id, role: "PIC", assignedAt: data.startDate },
    })
    await seedRequirements(project.id, data.startDate)

    // A finished project should have finished paperwork. This also gives the
    // dashboard one complete 6/6 badge, so the completeness metric visibly has
    // two states instead of reading "every project is incomplete".
    if (data.status === "COMPLETED") {
      for (const requirement of DEFAULT_REQUIREMENT_TEMPLATE.filter((r) => r.isMandatory)) {
        const key = requirement.categoryKey ?? "OTHER"
        const uploader = ["INVOICE", "PAYMENT", "PURCHASE_ORDER"].includes(key)
          ? siti
          : ceo

        const stored = await storePdf(
          requirement.label,
          [
            `Proyek  : ${data.name}`,
            `Kode    : ${data.code}`,
            `Dokumen : ${requirement.label}`,
            `Kapal   : ${data.vesselName ?? "-"}`,
            "",
            "Dokumen kelengkapan proyek yang telah diserahterimakan.",
          ],
          `${key.toLowerCase()}-${data.code.toLowerCase()}.pdf`
        )

        const document = await prisma.document.create({
          data: {
            projectId: project.id,
            kind: "PROJECT_DOCUMENT",
            categoryId: categoryId(key),
            name: requirement.label,
            documentDate: data.startDate,
            uploadedById: uploader.id,
            uploadedAt: data.startDate,
            ...stored,
          },
        })

        await fulfilRequirement(project.id, requirement.label, document.id, data.startDate)
      }
    }

    if (data.currentProgress > 0 && data.lastProgressAt) {
      await prisma.progressUpdate.create({
        data: {
          projectId: project.id,
          authorId: pic.id,
          previousProgress: 0,
          progress: data.currentProgress,
          description:
            data.status === "COMPLETED"
              ? "Seluruh pekerjaan selesai dan diserahterimakan kepada pemilik kapal."
              : "Pekerjaan tahap awal berjalan sesuai rencana.",
          reportedAt: data.lastProgressAt,
          createdAt: data.lastProgressAt,
        },
      })
    }

    await logActivity({
      projectId: project.id,
      actorId: admin.id,
      action: "PROJECT_CREATED",
      summary: `membuat proyek ${data.name}`,
      targetType: "Project",
      targetId: project.id,
      createdAt: data.startDate,
    })
  }

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  await prisma.appSetting.createMany({
    data: [
      { key: "app.name", value: process.env.NEXT_PUBLIC_APP_NAME ?? "RKL ProjectHub" },
      { key: "app.logoUrl", value: "/brand/LogoPT.png" },
    ],
  })

  // -------------------------------------------------------------------------
  const [projectCount, documentCount, requirementCount] = await Promise.all([
    prisma.project.count(),
    prisma.document.count(),
    prisma.documentRequirement.count(),
  ])

  console.log("\nSeed complete.")
  console.log(`  users        5`)
  console.log(`  projects     ${projectCount}`)
  console.log(`  documents    ${documentCount}`)
  console.log(`  requirements ${requirementCount}`)
  console.log(`\nDemo login password for every account: ${DEMO_PASSWORD}`)
  console.log("  ceo@demo.local / engineer@demo.local / accountant@demo.local / admin@demo.local")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
