import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

/**
 * Single PrismaClient for the whole app.
 *
 * Prisma 7 requires an explicit driver adapter. We use the pg adapter against
 * DATABASE_URL - on Supabase that is the transaction pooler (:6543), which is the
 * right endpoint for short application queries. Migrations use DIRECT_URL instead;
 * see prisma.config.ts.
 *
 * The global cache exists because Next.js hot-reload re-evaluates modules on every
 * change in development, which would otherwise open a new pool each time until the
 * database refuses connections.
 *
 * This file must not import from next/* - see decision D1 in the planning doc.
 */

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill in the Supabase connection strings."
  )
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
