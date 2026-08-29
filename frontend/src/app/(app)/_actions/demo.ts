"use server"

import { requireUser } from "@/server/auth/guards"
import { getDemoIdentity, type DemoIdentity } from "@/server/services/demo-service"

/**
 * Thin server action wrapper. The rules live in demo-service; this only checks
 * that a session exists and hands the result back to the client component.
 */
export async function switchDemoIdentity(userId: string): Promise<DemoIdentity> {
  await requireUser()
  return getDemoIdentity(userId)
}
