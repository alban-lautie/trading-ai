import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import type { SaleWithPosition } from "@/features/sales/queries"

interface SalesTableProps {
  sales: SaleWithPosition[]
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

/** Detailed table of every recorded sale, with realized P/L. */
export function SalesTable({ sales }: SalesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ventes réalisées</CardTitle>
        <CardDescription>
          Historique des ventes : ce que tu as investi, ce que tu as récupéré
          et la plus-value réalisée par ligne.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Aucune vente enregistrée pour le moment.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead className="text-right">Prix achat</TableHead>
                <TableHead className="text-right">Prix vente</TableHead>
                <TableHead className="text-right">Reçu</TableHead>
                <TableHead className="text-right">+/- value</TableHead>
                <TableHead className="text-right">Perf</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((entry) => {
                const { sale, position } = entry
                const pnlColor = pnlColorClass(entry.realizedPnl)
                return (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {dateFormatter.format(new Date(sale.sold_at))}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/positions/${position.id}`}
                        className="hover:underline"
                      >
                        <span className="font-medium">{position.symbol}</span>
                        {position.name ? (
                          <span className="text-muted-foreground ml-1 text-xs">
                            {position.name}
                          </span>
                        ) : null}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(sale.quantity).toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(
                        Number(sale.average_buy_price),
                        sale.currency
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(Number(sale.sell_price), sale.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(entry.proceeds, sale.currency)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${pnlColor}`}
                    >
                      {formatSignedCurrency(entry.realizedPnl, sale.currency)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${pnlColor}`}
                    >
                      {formatPercent(entry.realizedPnlPercent)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
