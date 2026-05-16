import { Card, CardContent } from "@/components/ui/card"
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  pnlColorClass,
} from "@/lib/format"
import type { PositionWithMetrics } from "@/lib/portfolio"

interface PositionMetricCardsProps {
  metrics: PositionWithMetrics
}

/** Live figures for a single position, shown on its detail page. */
export function PositionMetricCards({ metrics }: PositionMetricCardsProps) {
  const { position, quote, marketValue, unrealizedPnl, unrealizedPnlPercent } =
    metrics
  const currency = position.currency

  const cards = [
    {
      label: "Cours actuel",
      value: quote
        ? formatCurrency(quote.price, quote.currency)
        : "indisponible",
      className: "",
    },
    {
      label: "Valeur de la position",
      value:
        marketValue !== null ? formatCurrency(marketValue, currency) : "—",
      className: "",
    },
    {
      label: "+/- value latente",
      value:
        unrealizedPnl !== null
          ? formatSignedCurrency(unrealizedPnl, currency)
          : "—",
      className: pnlColorClass(unrealizedPnl),
    },
    {
      label: "Performance",
      value:
        unrealizedPnlPercent !== null
          ? formatPercent(unrealizedPnlPercent)
          : "—",
      className: pnlColorClass(unrealizedPnlPercent),
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent>
            <p className="text-muted-foreground text-sm font-medium">
              {card.label}
            </p>
            <p
              className={`mt-1 text-xl font-semibold tabular-nums ${card.className}`}
            >
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
