import type { Metadata } from "next"
import Link from "next/link"

import { signOut } from "@/app/login/actions"
import { AppNav } from "@/components/app/app-nav"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/features/auth"

export const metadata: Metadata = {
  // Application routes are user-private and must never be indexed.
  robots: { index: false, follow: false },
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await requireUser()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <Link
          href="/dashboard"
          className="mb-6 block text-lg font-semibold tracking-tight"
        >
          Trading<span className="text-emerald-600">AI</span>
        </Link>
        <AppNav />
        <div className="mt-6 border-t pt-4">
          <p className="text-muted-foreground mb-2 truncate text-xs">
            {user.email}
          </p>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm" className="w-full">
              Se déconnecter
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  )
}
