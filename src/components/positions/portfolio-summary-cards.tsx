import { Banknote, Percent, TrendingDown, TrendingUp, Wallet } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
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
  const isGain = summary.unrealizedPnl >= 0
  const TrendIcon = isGain ? TrendingUp : TrendingDown
  const pnlColor = pnlColorClass(summary.unrealizedPnl)

  const cards = [
    {
      label: "Valeur du portefeuille",
      value: formatCurrency(summary.marketValue),
      icon: Wallet,
      valueClass: "",
      iconClass: "bg-primary/10 text-primary",
    },
    {
      label: "Montant investi",
      value: formatCurrency(summary.costBasis),
      icon: Banknote,
      valueClass: "",
      iconClass: "bg-muted text-muted-foreground",
    },
    {
      label: "+/- value latente",
      value: formatSignedCurrency(summary.unrealizedPnl),
      icon: TrendIcon,
      valueClass: pnlColor,
      iconClass: isGain
        ? "bg-emerald-600/10 text-emerald-600"
        : "bg-red-600/10 text-red-600",
    },
    {
      label: "Performance",
      value: formatPercent(summary.unrealizedPnlPercent),
      icon: Percent,
      valueClass: pnlColor,
      iconClass: isGain
        ? "bg-emerald-600/10 text-emerald-600"
        : "bg-red-600/10 text-red-600",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, valueClass, iconClass }) => (
        <Card key={label}>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">
                {label}
              </p>
              <p className={`text-2xl font-semibold tabular-nums ${valueClass}`}>
                {value}
              </p>
            </div>
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
            >
              <Icon className="size-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
