import { Banknote, TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  pnlColorClass,
} from "@/lib/format"
import type { SalesOverview } from "@/features/sales/queries"

interface SalesStatsCardProps {
  overview: SalesOverview
}

/** Headline figures for the realized P/L: invested vs received vs gain. */
export function SalesStatsCard({ overview }: SalesStatsCardProps) {
  const isGain = overview.totalRealizedPnl >= 0
  const TrendIcon = isGain ? TrendingUp : TrendingDown
  const pnlColor = pnlColorClass(overview.totalRealizedPnl)

  const cards = [
    {
      label: "Investi (vendu)",
      value: formatCurrency(overview.totalCostBasis),
      icon: Banknote,
      valueClass: "",
      iconClass: "bg-muted text-muted-foreground",
    },
    {
      label: "Reçu à la vente",
      value: formatCurrency(overview.totalProceeds),
      icon: Banknote,
      valueClass: "",
      iconClass: "bg-primary/10 text-primary",
    },
    {
      label: "Plus-value réalisée",
      value: formatSignedCurrency(overview.totalRealizedPnl),
      icon: TrendIcon,
      valueClass: pnlColor,
      iconClass: isGain
        ? "bg-emerald-600/10 text-emerald-600"
        : "bg-red-600/10 text-red-600",
    },
    {
      label: "Performance réalisée",
      value: formatPercent(overview.totalRealizedPnlPercent),
      icon: TrendIcon,
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
