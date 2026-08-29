/**
 * Application-level configuration.
 *
 * Section 2 of the planning doc requires the app name to be changeable, so it is
 * never hardcoded in a component. Import from here instead.
 */

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "RKL ProjectHub"

export const COMPANY_NAME = "PT Rajasa Kemenangan Logistik"
export const COMPANY_SHORT = "RKL"
export const LOGO_PATH = "/brand/LogoPT.png"

/**
 * Enables the topbar role switcher and the demo account hints (decision D6).
 * MUST be false at go-live - see "Go-Live Migration" in README.md.
 *
 * SERVER ONLY. DEMO_MODE has no NEXT_PUBLIC_ prefix, which is deliberate: it is a
 * security switch, and a client bundle must not be able to claim demo mode is on.
 * The consequence is that in a "use client" component this reads `undefined`, so
 * a client component that branches on it renders differently on the server than in
 * the browser and throws a hydration error.
 *
 * Read it in a server component and pass the boolean down as a prop.
 * The same applies to MAX_UPLOAD_BYTES below.
 */
export const DEMO_MODE = process.env.DEMO_MODE === "true"

/** Upload guard. SERVER ONLY, same reason as DEMO_MODE. */
export const MAX_UPLOAD_BYTES = Number(
  process.env.MAX_UPLOAD_BYTES ?? 20 * 1024 * 1024
)

/** Formats accepted by the prototype (planning section 19). */
export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const

export const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const

/**
 * A project counts as delayed when the target date has passed and it is not
 * finished. Planning section 14: this is derived, never a stored status.
 * Kept here so the UI and the services agree on one definition.
 */
export const DELAYED_STATUSES = ["PLANNING", "IN_PROGRESS", "ON_HOLD"] as const

/** A project is "close to deadline" within this many days. */
export const DEADLINE_WARNING_DAYS = 14

/** A project is "stale" when it has had no progress update for this long. */
export const STALE_PROGRESS_DAYS = 21
