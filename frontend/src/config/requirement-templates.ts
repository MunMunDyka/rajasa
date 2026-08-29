/**
 * Default "Kelengkapan Dokumen" checklist (planning section 19b).
 *
 * Every new project is seeded with these requirements, so the moment a project is
 * created the Documents tab already shows 0/6 mandatory instead of an empty page.
 * That is the demo moment: create a project, watch the checklist appear, upload
 * one file, watch it move to 1/6.
 *
 * Admin can add or remove requirements per project afterwards; this is only the
 * starting set.
 */

export type RequirementTemplateItem = {
  label: string
  /** Matches a key in document-categories.ts. Null means any category. */
  categoryKey: string | null
  isMandatory: boolean
  sortOrder: number
  /** Days after the project start date. Null means no due date. */
  dueAfterDays: number | null
}

export const DEFAULT_REQUIREMENT_TEMPLATE: RequirementTemplateItem[] = [
  {
    label: "Kontrak Kerja",
    categoryKey: "CONTRACT",
    isMandatory: true,
    sortOrder: 10,
    dueAfterDays: 7,
  },
  {
    label: "Surat Perintah Kerja (SPK)",
    categoryKey: "WORK_ORDER",
    isMandatory: true,
    sortOrder: 20,
    dueAfterDays: 7,
  },
  {
    label: "Purchase Order",
    categoryKey: "PURCHASE_ORDER",
    isMandatory: true,
    sortOrder: 30,
    dueAfterDays: 14,
  },
  {
    label: "Laporan Inspeksi Awal",
    categoryKey: "REPORT",
    isMandatory: true,
    sortOrder: 40,
    dueAfterDays: 21,
  },
  {
    label: "Berita Acara Serah Terima (BAST)",
    categoryKey: "HANDOVER",
    isMandatory: true,
    sortOrder: 50,
    dueAfterDays: null,
  },
  {
    label: "Invoice Termin 1",
    categoryKey: "INVOICE",
    isMandatory: true,
    sortOrder: 60,
    dueAfterDays: null,
  },
  {
    label: "Bukti Pembayaran Termin 1",
    categoryKey: "PAYMENT",
    isMandatory: false,
    sortOrder: 70,
    dueAfterDays: null,
  },
  {
    label: "Foto Dokumentasi Akhir",
    categoryKey: "PHOTO",
    isMandatory: false,
    sortOrder: 80,
    dueAfterDays: null,
  },
]

/** 6 of the 8 above are mandatory - the number the dashboard badge counts against. */
export const DEFAULT_MANDATORY_COUNT = DEFAULT_REQUIREMENT_TEMPLATE.filter(
  (item) => item.isMandatory
).length
