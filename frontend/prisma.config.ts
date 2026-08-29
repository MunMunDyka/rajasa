import "dotenv/config"
import { defineConfig, env } from "prisma/config"

/**
 * Prisma 7 moved connection URLs out of schema.prisma and into this file.
 *
 * This config is used by the Prisma CLI only - migrate, db push, seed.
 * The running application does NOT read it; it builds its own client with a
 * driver adapter in src/server/db/prisma.ts.
 *
 * Why DIRECT_URL here and DATABASE_URL there:
 *   DIRECT_URL     Supabase session mode, port 5432. Migrations need a real
 *                  session - they cannot run through a transaction pooler.
 *   DATABASE_URL   Supabase transaction pooler, port 6543. Right for app queries.
 *
 * At go-live both variables point at the same local Postgres on the VPS and this
 * file needs no change. See "Go-Live Migration" in ../README.md.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
})
