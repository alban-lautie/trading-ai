"use client"

import { useMemo, useState } from "react"

import { PositionTableRow } from "@/components/positions/position-table-row"
import {
  sortPositions,
  type SortDirection,
  type SortKey,
} from "@/components/positions/positions-sort"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PositionWithMetrics } from "@/lib/portfolio"

interface PositionsTableProps {
  rows: PositionWithMetrics[]
}

/** Renders the user's positions with their live P/L metrics. */
export function PositionsTable({ rows }: PositionsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [direction, setDirection] = useState<SortDirection>("desc")

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows
    return sortPositions(rows, sortKey, direction)
  }, [rows, sortKey, direction])

  /** Toggles direction when re-clicking a column, else sorts the new one. */
  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setDirection("desc")
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Aucune position pour le moment. Ajoutez votre première action.
      </p>
    )
  }

  const headProps = { activeKey: sortKey, direction, onSort: handleSort }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead sortKey="symbol" {...headProps}>
              Action
            </SortableTableHead>
            <SortableTableHead
              sortKey="quantity"
              className="text-right"
              {...headProps}
            >
              Quantité
            </SortableTableHead>
            <SortableTableHead
              sortKey="averagePrice"
              className="text-right"
              {...headProps}
            >
              Prix d&apos;achat
            </SortableTableHead>
            <SortableTableHead
              sortKey="price"
              className="text-right"
              {...headProps}
            >
              Cours actuel
            </SortableTableHead>
            <SortableTableHead
              sortKey="marketValue"
              className="text-right"
              {...headProps}
            >
              Valeur
            </SortableTableHead>
            <SortableTableHead
              sortKey="unrealizedPnl"
              className="text-right"
              {...headProps}
            >
              +/- value latente
            </SortableTableHead>
            <SortableTableHead
              sortKey="unrealizedPnlPercent"
              className="text-right"
              {...headProps}
            >
              Perf.
            </SortableTableHead>
            <SortableTableHead sortKey="marketOpen" {...headProps}>
              Marché
            </SortableTableHead>
            <SortableTableHead sortKey="quoteTime" {...headProps}>
              Dernière actu du cours
            </SortableTableHead>
            <SortableTableHead sortKey="recommendation" {...headProps}>
              Dernière analyse
            </SortableTableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row) => (
            <PositionTableRow key={row.position.id} row={row} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
