import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import type { Position } from "@/lib/types"

interface PositionInfoCardProps {
  position: Position
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" })

/** Static details of a position (quantity, purchase price, notes…). */
export function PositionInfoCard({ position }: PositionInfoCardProps) {
  const rows = [
    { label: "Quantité", value: String(Number(position.quantity)) },
    {
      label: "Prix d'achat moyen",
      value: formatCurrency(Number(position.average_price), position.currency),
    },
    { label: "Devise", value: position.currency },
    {
      label: "Date d'achat",
      value: dateFormatter.format(new Date(position.opened_at)),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Détail de la position</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 border-b pb-2"
            >
              <dt className="text-muted-foreground text-sm">{row.label}</dt>
              <dd className="text-sm font-medium tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
        {position.notes ? (
          <div className="mt-4">
            <p className="text-muted-foreground text-sm">Notes</p>
            <p className="mt-1 text-sm whitespace-pre-line">
              {position.notes}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
