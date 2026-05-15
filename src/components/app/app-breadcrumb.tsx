"use client"

import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

const SECTION_LABELS: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/positions": "Positions",
  "/alerts": "Alertes",
  "/ai": "Suivi IA",
}

/** Shows the current application section in the app header. */
export function AppBreadcrumb() {
  const pathname = usePathname()
  const label = SECTION_LABELS[pathname] ?? "Trading AI"

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>{label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
