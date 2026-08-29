import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { Topbar, type DemoOption } from "@/components/layout/topbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { DEMO_MODE } from "@/config/app"
import { getSessionUser } from "@/server/auth/guards"
import { listDemoIdentities } from "@/server/services/demo-service"

/**
 * Shell for every signed-in page.
 *
 * Middleware already redirects anonymous visitors, but the session is re-checked
 * here because middleware guards routing, not data - and this layout is what hands
 * the role down to the navigation.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  let demoOptions: DemoOption[] = []
  if (DEMO_MODE && user.isDemo) {
    demoOptions = (await listDemoIdentities()).map((identity) => ({
      id: identity.id,
      name: identity.name,
      role: identity.role,
      position: identity.position,
    }))
  }

  return (
    <SidebarProvider
      className="bg-background"
      // 14rem instead of the 16rem default. The navigation labels are short, so
      // the extra 2rem was empty gutter that the content could use instead.
      style={{ "--sidebar-width": "14rem" } as React.CSSProperties}
    >
      <AppSidebar role={user.role} />
      <SidebarInset className="min-w-0">
        <Topbar user={user} demoOptions={demoOptions} />
        <div className="flex-1 px-4 py-5 sm:px-6 sm:py-6 xl:px-8 xl:py-7">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
