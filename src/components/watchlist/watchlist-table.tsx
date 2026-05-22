"use client"

import { useMemo, useState } from "react"

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import {
  sortWatchlist,
  type SortDirection,
  type WatchlistSortKey,
} from "@/components/watchlist/watchlist-sort"
import { WatchlistTableRow } from "@/components/watchlist/watchlist-table-row"
import type { WatchlistItemWithQuote } from "@/features/watchlist/queries"

interface WatchlistTableProps {
  rows: WatchlistItemWithQuote[]
}

/** Renders the watched stocks with their AI entry-point recommendations. */
export function WatchlistTable({ rows }: WatchlistTableProps) {
  const [sortKey, setSortKey] = useState<WatchlistSortKey | null>(null)
  const [direction, setDirection] = useState<SortDirection>("desc")

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows
    return sortWatchlist(rows, sortKey, direction)
  }, [rows, sortKey, direction])

  /** Toggles direction when re-clicking a column, else sorts the new one. */
  function handleSort(key: WatchlistSortKey) {
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
        Aucune action surveillée. Ajoutez-en une pour obtenir une
        recommandation de point d&apos;entrée.
      </p>
    )
  }

  const headProps = { activeKey: sortKey, direction, onSort: handleSort }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <SortableTableHead sortKey="symbol" {...headProps}>
              Action
            </SortableTableHead>
            <SortableTableHead
              sortKey="price"
              className="text-right"
              {...headProps}
            >
              Cours actuel
            </SortableTableHead>
            <SortableTableHead sortKey="entryAction" {...headProps}>
              Recommandation
            </SortableTableHead>
            <SortableTableHead sortKey="conviction" {...headProps}>
              Conviction
            </SortableTableHead>
            <SortableTableHead
              sortKey="entryPrice"
              className="text-right"
              {...headProps}
            >
              Prix d&apos;entrée
            </SortableTableHead>
            <SortableTableHead
              sortKey="entryGap"
              className="text-right"
              {...headProps}
            >
              Écart cours / entrée
            </SortableTableHead>
            <SortableTableHead sortKey="recommendation" {...headProps}>
              Mise à jour
            </SortableTableHead>
            <TableHead>Alerte</TableHead>
            <TableHead className="w-px" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row) => (
            <WatchlistTableRow key={row.item.id} row={row} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
