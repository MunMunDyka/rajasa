import type { UserRole } from "@prisma/client"
import type { DefaultSession } from "next-auth"

/**
 * Widens the Auth.js session with the fields every page needs for role gating,
 * so nothing has to hit the database just to render navigation.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      position: string | null
      isDemo: boolean
    } & DefaultSession["user"]
  }

  interface User {
    id?: string
    role: UserRole
    position: string | null
    isDemo: boolean
  }
}

/**
 * Augment "@auth/core/jwt", not "next-auth/jwt".
 *
 * next-auth/jwt is only `export * from "@auth/core/jwt"`, and a re-export cannot be
 * augmented - the JWT interface is declared in the core package. Targeting the
 * wrong one silently does nothing and every token field stays `unknown`, because
 * JWT extends Record<string, unknown>.
 */
declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    role: UserRole
    position: string | null
    isDemo: boolean
  }
}
