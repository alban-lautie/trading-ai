"use client"

import { useRouter } from "next/navigation"

import { PositionRowActions } from "@/components/positions/position-row-actions"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  formatCurrency,
  formatGenerationDate,
  formatPercent,
  formatQuoteTime,
  formatSignedCurrency,
  pnlColorClass,
} from "@/lib/format"
import type { PositionWithMetrics } from "@/lib/portfolio"

interface PositionTableRowProps {
  row: PositionWithMetrics
}

/** A single, clickable position row that opens the position detail. */
export function PositionTableRow({ row }: PositionTableRowProps) {
  const router = useRouter()
  const { position, quote, marketValue, unrealizedPnl, unrealizedPnlPercent } =
    row
  const currency = position.currency

  return (
    <TableRow
      className="hover:bg-muted/60 cursor-pointer"
      onClick={() => router.push(`/positions/${position.id}`)}
    >
      <TableCell>
        <div className="font-medium">{position.symbol}</div>
        {position.name ? (
          <div className="text-muted-foreground text-xs">{position.name}</div>
        ) : null}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {Number(position.quantity)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatCurrency(Number(position.average_price), currency)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {quote ? (
          formatCurrency(quote.price, quote.currency)
        ) : (
          <span className="text-muted-foreground">indisponible</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {marketValue !== null ? (
          formatCurrency(marketValue, currency)
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell
        className={`text-right tabular-nums ${pnlColorClass(unrealizedPnl)}`}
      >
        {unrealizedPnl !== null ? (
          formatSignedCurrency(unrealizedPnl, currency)
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell
        className={`text-right tabular-nums ${pnlColorClass(unrealizedPnlPercent)}`}
      >
        {unrealizedPnlPercent !== null ? (
          formatPercent(unrealizedPnlPercent)
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
        {quote ? formatQuoteTime(quote.timestamp) : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
        {row.recommendationGeneratedAt
          ? formatGenerationDate(row.recommendationGeneratedAt)
          : "—"}
      </TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}>
        <PositionRowActions position={position} />
      </TableCell>
    </TableRow>
  )
}
