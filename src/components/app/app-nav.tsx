"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, LayoutDashboard, Sparkles, Wallet } from "lucide-react"

import { cn } from "@/lib/utils"

const links = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/positions", label: "Positions", icon: Wallet },
  { href: "/alerts", label: "Alertes", icon: Bell },
  { href: "/ai", label: "Suivi IA", icon: Sparkles },
]

/** Primary navigation for the authenticated application. */
export function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="grid gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon size={18} aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
