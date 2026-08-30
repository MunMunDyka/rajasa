import type { Metadata } from "next"
import Image from "next/image"

import { APP_NAME, COMPANY_NAME, DEMO_MODE, LOGO_PATH } from "@/config/app"

import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Masuk",
}

const LOGIN_BACKGROUND_ZOOM = 1.5

function BrandLockup() {
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src={LOGO_PATH}
        alt={COMPANY_NAME}
        width={680}
        height={318}
        className="h-16 w-auto"
        priority
      />
      <p className="mt-4 text-xl leading-none font-semibold text-brand-navy">
        {APP_NAME}
      </p>
      <p className="mt-2 text-xs font-medium text-muted-foreground">
        Portal Manajemen Proyek
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-1 bg-card">
      <section className="relative hidden min-h-screen w-[56%] overflow-hidden lg:block">
        <Image
          src="/brand/background.webp"
          alt=""
          fill
          priority
          sizes="56vw"
          className="object-cover object-center"
          style={{ transform: `scale(${LOGIN_BACKGROUND_ZOOM})` }}
        />
        <div className="absolute inset-0 bg-brand-navy/72" />
        <div className="absolute inset-y-0 right-0 w-1 bg-brand-maroon" />

        <div className="relative flex h-full min-h-screen flex-col justify-end p-10 xl:p-14">
          <div className="max-w-xl pb-[8vh]">
            <p className="text-sm font-semibold text-white/65">Ruang kerja internal</p>
            <h1 className="mt-3 text-4xl leading-tight font-semibold text-white xl:text-5xl">
              RKL ProjectHub
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/72">
              Pantau pekerjaan, progress, dan kelengkapan dokumen proyek dalam satu portal.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen w-full items-center px-5 py-10 sm:px-10 lg:w-[44%]">
        <div className="mx-auto w-full max-w-[25rem]">
          <BrandLockup />

          <div className="mt-10">
            <LoginForm showDemoAccounts={DEMO_MODE} />
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            {COMPANY_NAME}
          </p>
        </div>
      </section>
    </main>
  )
}
