import { PositionRowActions } from "@/components/positions/position-row-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  pnlColorClass,
} from "@/lib/format"
import type { PositionWithMetrics } from "@/lib/portfolio"

interface PositionsTableProps {
  rows: PositionWithMetrics[]
}

/** Renders the user's positions with their live P/L metrics. */
export function PositionsTable({ rows }: PositionsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Aucune position pour le moment. Ajoutez votre première action.
      </p>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead className="text-right">Quantité</TableHead>
            <TableHead className="text-right">Prix d&apos;achat</TableHead>
            <TableHead className="text-right">Cours actuel</TableHead>
            <TableHead className="text-right">Valeur</TableHead>
            <TableHead className="text-right">+/- value latente</TableHead>
            <TableHead className="text-right">Perf.</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ position, quote, marketValue, unrealizedPnl, unrealizedPnlPercent }) => {
            const currency = position.currency
            return (
              <TableRow key={position.id}>
                <TableCell>
                  <div className="font-medium">{position.symbol}</div>
                  {position.name ? (
                    <div className="text-muted-foreground text-xs">
                      {position.name}
                    </div>
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
                <TableCell>
                  <PositionRowActions position={position} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
