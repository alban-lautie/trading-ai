"use client"

import type { ReactNode } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import type {
  SortDirection,
  SortKey,
} from "@/components/positions/positions-sort"
import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface SortableTableHeadProps {
  sortKey: SortKey
  activeKey: SortKey | null
  direction: SortDirection
  onSort: (key: SortKey) => void
  className?: string
  children: ReactNode
}

/** A positions table header cell whose label toggles sorting on click. */
export function SortableTableHead({
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
  children,
}: SortableTableHeadProps) {
  const isActive = activeKey === sortKey
  const Icon = !isActive
    ? ChevronsUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "hover:text-foreground inline-flex items-center gap-1",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {children}
        <Icon size={14} />
      </button>
    </TableHead>
  )
}
