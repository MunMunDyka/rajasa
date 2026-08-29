import type { UserRole } from "@prisma/client"
import type { NextAuthConfig } from "next-auth"

/** Shape the demo role switcher sends through useSession().update(). */
type DemoIdentity = {
  id: string
  role: UserRole
  name: string | null
  email: string | null
  position: string | null
  isDemo: boolean
}

/**
 * Edge-safe half of the auth setup.
 *
 * Middleware runs on the edge runtime, which cannot load Prisma or bcrypt. So the
 * pieces middleware needs - session strategy, callbacks, the route guard - live
 * here with no database imports, and the Credentials provider that does touch the
 * database is added in ./index.ts, which only ever runs in Node.
 *
 * This split is the documented Auth.js v5 pattern, not a workaround.
 */
export const authConfig = {
  // Credentials sign-in requires JWT sessions; there is no database session table.
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [], // filled in by ./index.ts

  callbacks: {
    /**
     * Copies the user fields onto the token at sign-in so later requests can gate
     * on role without a database round trip.
     *
     * `trigger === "update"` is how the demo role switcher swaps identity: it calls
     * useSession().update() with the new demo user, and this merges it in.
     */
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id ?? token.sub ?? ""
        token.role = user.role
        token.name = user.name ?? null
        token.email = user.email ?? null
        token.position = user.position
        token.isDemo = user.isDemo
      }

      if (trigger === "update") {
        // `session` here is whatever useSession().update() was called with, so it
        // is untyped by definition. Narrow it before trusting any of it.
        const patch = (session as { user?: Partial<DemoIdentity> } | undefined)?.user

        if (patch?.id && patch.role) {
          token.id = patch.id
          token.role = patch.role
          token.name = patch.name ?? null
          token.email = patch.email ?? null
          token.position = patch.position ?? null
          token.isDemo = patch.isDemo ?? false
        }
      }

      return token
    },

    session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      session.user.position = token.position
      session.user.isDemo = token.isDemo
      return session
    },

    /**
     * Route guard for middleware. Everything except /login and the auth API
     * requires a session; a signed-in user visiting /login is bounced to the
     * dashboard.
     */
    authorized({ auth, request }) {
      const isSignedIn = Boolean(auth?.user)
      const { pathname } = request.nextUrl

      if (pathname === "/login") {
        if (isSignedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl))
        }
        return true
      }

      return isSignedIn
    },
  },
} satisfies NextAuthConfig
