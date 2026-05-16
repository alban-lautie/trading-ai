import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency, formatPercent, pnlColorClass } from "@/lib/format"
import type { PriceHistory } from "@/lib/market-data"
import type { PositionWithMetrics } from "@/lib/portfolio"

interface PositionBenchmarksProps {
  metrics: PositionWithMetrics
  history: PriceHistory | null
  portfolioWeight: number | null
}

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 1,
})

/** Decision benchmarks: 52-week range, break-even, targets, portfolio weight. */
export function PositionBenchmarks({
  metrics,
  history,
  portfolioWeight,
}: PositionBenchmarksProps) {
  const { position, quote, unrealizedPnlPercent } = metrics
  const currency = position.currency
  const averagePrice = Number(position.average_price)
  const price = quote?.price ?? null
  const low = history?.fiftyTwoWeekLow ?? null
  const high = history?.fiftyTwoWeekHigh ?? null

  const figures = [
    {
      label: "Point mort (prix d'achat)",
      value: formatCurrency(averagePrice, currency),
      className: "",
    },
    {
      label: "Performance vs achat",
      value:
        unrealizedPnlPercent !== null
          ? formatPercent(unrealizedPnlPercent)
          : "—",
      className: pnlColorClass(unrealizedPnlPercent),
    },
    {
      label: "Poids dans le portefeuille",
      value:
        portfolioWeight !== null
          ? percentFormatter.format(portfolioWeight)
          : "—",
      className: "",
    },
  ]

  const targets = [
    { label: "Objectif +10 %", value: averagePrice * 1.1 },
    { label: "Objectif +25 %", value: averagePrice * 1.25 },
    { label: "Seuil de perte -10 %", value: averagePrice * 0.9 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Repères de décision</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-muted-foreground mb-2 text-xs">
            Position dans le range 52 semaines
          </p>
          {price !== null && low !== null && high !== null && high > low ? (
            <>
              <div className="bg-muted relative h-2 rounded-full">
                <div
                  className="bg-primary absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background"
                  style={{
                    left: `${Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100))}%`,
                  }}
                />
              </div>
              <div className="text-muted-foreground mt-1.5 flex justify-between text-xs tabular-nums">
                <span>{formatCurrency(low, currency)}</span>
                <span>{formatCurrency(high, currency)}</span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Données indisponibles.
            </p>
          )}
        </div>

        <dl className="grid gap-2">
          {figures.map((figure) => (
            <div
              key={figure.label}
              className="flex items-center justify-between gap-4 border-b pb-2"
            >
              <dt className="text-muted-foreground text-sm">{figure.label}</dt>
              <dd
                className={`text-sm font-medium tabular-nums ${figure.className}`}
              >
                {figure.value}
              </dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="text-muted-foreground mb-2 text-xs">
            Prix-cibles (par rapport au prix d&apos;achat)
          </p>
          <dl className="grid gap-2">
            {targets.map((target) => (
              <div
                key={target.label}
                className="flex items-center justify-between gap-4"
              >
                <dt className="text-sm">{target.label}</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {formatCurrency(target.value, currency)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </CardContent>
    </Card>
  )
}
