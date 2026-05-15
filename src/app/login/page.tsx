import type { Metadata } from "next"
import Link from "next/link"

import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: false },
}

interface LoginPageProps {
  searchParams: Promise<{ mode?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { mode } = await searchParams
  const defaultMode = mode === "signup" ? "signup" : "signin"

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <Link href="/" className="text-xl font-semibold tracking-tight">
        Trading<span className="text-primary">AI</span>
      </Link>
      <LoginForm defaultMode={defaultMode} />
    </main>
  )
}
