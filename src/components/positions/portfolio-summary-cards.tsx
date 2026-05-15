import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  pnlColorClass,
} from "@/lib/format"
import type { PortfolioSummary } from "@/lib/portfolio"

interface PortfolioSummaryCardsProps {
  summary: PortfolioSummary
}

/** Headline portfolio figures shown above the positions table. */
export function PortfolioSummaryCards({ summary }: PortfolioSummaryCardsProps) {
  const cards = [
    {
      label: "Valeur du portefeuille",
      value: formatCurrency(summary.marketValue),
      className: "",
    },
    {
      label: "Montant investi",
      value: formatCurrency(summary.costBasis),
      className: "",
    },
    {
      label: "+/- value latente",
      value: formatSignedCurrency(summary.unrealizedPnl),
      className: pnlColorClass(summary.unrealizedPnl),
    },
    {
      label: "Performance",
      value: formatPercent(summary.unrealizedPnlPercent),
      className: pnlColorClass(summary.unrealizedPnlPercent),
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold tabular-nums ${card.className}`}>
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
