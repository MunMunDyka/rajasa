import { redirect } from "next/navigation"

/** Middleware sends anonymous visitors to /login; everyone else lands on the dashboard. */
export default function RootPage() {
  redirect("/dashboard")
}
