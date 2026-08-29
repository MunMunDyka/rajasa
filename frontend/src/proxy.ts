import NextAuth from "next-auth"

import { authConfig } from "@/server/auth/config"

/**
 * Signed-in check only. Next 16 calls this convention "proxy"; it is the same
 * request-time hook that used to be called middleware.
 *
 * The edge runtime cannot load Prisma or bcrypt, so this uses the database-free
 * half of the auth config. Role checks happen server-side in
 * src/server/auth/guards.ts, next to the data they protect - this proves that
 * someone is signed in, never that they may do a given thing.
 */
export default NextAuth(authConfig).auth

export const config = {
  matcher: [
    // Everything except Next internals, the auth API, and static assets.
    // The doubled backslash is deliberate: this is a string, so "\\." is the
    // regex escape for a literal dot.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|brand|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
}
