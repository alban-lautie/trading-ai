import { PositionTableRow } from "@/components/positions/position-table-row"
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
            <TableHead>Dernière analyse</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <PositionTableRow key={row.position.id} row={row} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
