import bcrypt from "bcryptjs"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"

import { prisma } from "@/server/db/prisma"

import { authConfig } from "./config"

/**
 * Full auth setup. Node runtime only - it loads Prisma and bcrypt.
 * Middleware uses ./config instead.
 */

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        })

        // Compare against a dummy hash when the user is missing so a wrong email
        // and a wrong password take the same time to fail.
        const hash =
          user?.passwordHash ??
          "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduO"

        const passwordMatches = await bcrypt.compare(password, hash)

        if (!user || !user.isActive || !passwordMatches) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          position: user.position,
          isDemo: user.isDemo,
        }
      },
    }),
  ],
})
