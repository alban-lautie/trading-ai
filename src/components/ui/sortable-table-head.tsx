"use client"

import type { ReactNode } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface SortableTableHeadProps<TKey extends string> {
  sortKey: TKey
  activeKey: TKey | null
  direction: "asc" | "desc"
  onSort: (key: TKey) => void
  className?: string
  children: ReactNode
}

/** A table header cell whose label toggles sorting on the given key. */
export function SortableTableHead<TKey extends string>({
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
  children,
}: SortableTableHeadProps<TKey>) {
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
