"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const schema = z.object({
  email: z.string().min(1, "Email wajib diisi.").email("Format email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
})

type FormValues = z.infer<typeof schema>

/** Shown under the form so a demo never stalls on a forgotten password. */
const DEMO_ACCOUNTS = [
  { label: "Direktur Utama", email: "ceo@demo.local" },
  { label: "Engineer", email: "engineer@demo.local" },
  { label: "Finance", email: "accountant@demo.local" },
  { label: "Administrator", email: "admin@demo.local" },
]

const DEMO_PASSWORD = "demo1234"

/**
 * `showDemoAccounts` arrives as a prop rather than being read from the
 * environment here. DEMO_MODE is server-only, so reading it inside a client
 * component gives `true` during SSR and `undefined` in the browser - which is a
 * hydration mismatch, not a cosmetic issue. See the note in src/config/app.ts.
 */
export function LoginForm({ showDemoAccounts }: { showDemoAccounts: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    })

    setIsSubmitting(false)

    if (result?.error) {
      // Deliberately vague: never reveal whether the email exists.
      toast.error("Email atau password salah.")
      form.setError("password", { message: "Email atau password salah." })
      return
    }

    toast.success("Berhasil masuk.")
    startTransition(() => {
      router.replace("/dashboard")
      router.refresh()
    })
  }

  function fillDemoAccount(email: string) {
    form.setValue("email", email, { shouldValidate: true })
    form.setValue("password", DEMO_PASSWORD, { shouldValidate: true })
  }

  const busy = isSubmitting || isPending

  return (
    <div className="space-y-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="username"
                    placeholder="nama@perusahaan.co.id"
                    className="h-10"
                    disabled={busy}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      disabled={busy}
                      // Room for the reveal button so long values never sit under it.
                      className="h-10 pr-10"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    disabled={busy}
                    // Not focusable: screen-reader and keyboard users move from the
                    // password field straight to the submit button, and the toggle
                    // is a convenience rather than a step in the flow.
                    tabIndex={-1}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" className="mt-2 h-10 w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="animate-spin" />
                Memproses...
              </>
            ) : (
              "Masuk"
            )}
          </Button>
        </form>
      </Form>

      {showDemoAccounts ? (
        <div className="rounded-lg border border-dashed bg-muted/40 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Akun demo
            </span>
            <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {DEMO_PASSWORD}
            </code>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 justify-start px-2 text-xs font-normal"
                disabled={busy}
                onClick={() => fillDemoAccount(account.email)}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
