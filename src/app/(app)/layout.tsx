import type { Metadata } from "next"

import { AppBreadcrumb } from "@/components/app/app-breadcrumb"
import { AppSidebar } from "@/components/app/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
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
    <SidebarProvider>
      <AppSidebar userEmail={user.email ?? ""} />
      <SidebarInset>
        <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <AppBreadcrumb />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
