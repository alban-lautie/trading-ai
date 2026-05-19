"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  Eye,
  LayoutDashboard,
  LineChart,
  Sparkles,
  Wallet,
} from "lucide-react"

import { NavUser } from "@/components/app/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/positions", label: "Positions", icon: Wallet },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/alerts", label: "Alertes", icon: Bell },
  { href: "/ai", label: "Suivi IA", icon: Sparkles },
]

interface AppSidebarProps {
  userEmail: string
}

/** Primary navigation sidebar for the authenticated application. */
export function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <LineChart className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Trading AI</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Suivi de portefeuille
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive =
                  pathname === href || pathname.startsWith(`${href}/`)
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                      <Link href={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser email={userEmail} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
