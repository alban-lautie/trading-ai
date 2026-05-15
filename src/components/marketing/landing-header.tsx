import Link from "next/link"

import { Button } from "@/components/ui/button"

/** Top navigation bar for the public marketing pages. */
export function LandingHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Trading<span className="text-emerald-600">AI</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button asChild>
            <Link href="/login?mode=signup">Commencer</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
