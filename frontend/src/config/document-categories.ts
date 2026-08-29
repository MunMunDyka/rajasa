/**
 * Document categories.
 *
 * Planning section 19: categories must not be hardcoded across components.
 * This file is the single source. It seeds the DocumentCategory table, and the
 * Settings page edits the rows from there afterwards - so treat this as the
 * initial catalogue, not a runtime lookup.
 */

export type CategoryGroupKey = "ENGINEERING" | "FINANCE" | "GENERAL"

export type DocumentCategorySeed = {
  key: string
  label: string
  group: CategoryGroupKey
  sortOrder: number
}

export const DOCUMENT_CATEGORIES: DocumentCategorySeed[] = [
  // --- General / legal -----------------------------------------------------
  { key: "CONTRACT", label: "Kontrak", group: "GENERAL", sortOrder: 10 },
  { key: "WORK_ORDER", label: "Surat Perintah Kerja", group: "GENERAL", sortOrder: 20 },
  { key: "PERMIT", label: "Perizinan", group: "GENERAL", sortOrder: 30 },

  // --- Engineering ---------------------------------------------------------
  { key: "ENGINEERING", label: "Dokumen Teknis", group: "ENGINEERING", sortOrder: 40 },
  { key: "REPORT", label: "Laporan", group: "ENGINEERING", sortOrder: 50 },
  { key: "HANDOVER", label: "Berita Acara Serah Terima", group: "ENGINEERING", sortOrder: 60 },
  { key: "PROGRESS_EVIDENCE", label: "Bukti Progress", group: "ENGINEERING", sortOrder: 70 },
  { key: "PHOTO", label: "Foto Dokumentasi", group: "ENGINEERING", sortOrder: 80 },

  // --- Finance -------------------------------------------------------------
  { key: "INVOICE", label: "Invoice", group: "FINANCE", sortOrder: 90 },
  { key: "PURCHASE_ORDER", label: "Purchase Order", group: "FINANCE", sortOrder: 100 },
  { key: "PAYMENT", label: "Bukti Pembayaran", group: "FINANCE", sortOrder: 110 },
  { key: "FINANCIAL_REPORT", label: "Laporan Keuangan", group: "FINANCE", sortOrder: 120 },

  // --- Fallback ------------------------------------------------------------
  { key: "OTHER", label: "Lainnya", group: "GENERAL", sortOrder: 999 },
]

/**
 * Categories an Accountant may upload into (planning section 7 permission matrix).
 * Everything else in FINANCE plus nothing outside it.
 */
export const ACCOUNTANT_CATEGORY_KEYS = [
  "INVOICE",
  "PURCHASE_ORDER",
  "PAYMENT",
  "FINANCIAL_REPORT",
  "OTHER",
] as const

/**
 * The category automatically assigned to files an Engineer attaches to a
 * progress update. Engineers never choose a category themselves.
 */
export const PROGRESS_EVIDENCE_CATEGORY_KEY = "PROGRESS_EVIDENCE"
