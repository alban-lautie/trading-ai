"use client"

import { useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { ChartRange, PriceHistory } from "@/lib/market-data"

interface PositionPriceChartProps {
  symbol: string
  initialHistory: PriceHistory | null
}

const RANGES: { value: ChartRange; label: string }[] = [
  { value: "1mo", label: "1M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1A" },
]

const chartConfig = {
  close: { label: "Cours", color: "var(--chart-1)" },
} satisfies ChartConfig

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
})

/** Price history chart for a position, with selectable range. */
export function PositionPriceChart({
  symbol,
  initialHistory,
}: PositionPriceChartProps) {
  const [range, setRange] = useState<ChartRange>("6mo")
  const [cache, setCache] = useState<Partial<Record<ChartRange, PriceHistory>>>(
    initialHistory ? { "6mo": initialHistory } : {}
  )
  const [loading, setLoading] = useState(false)

  const history = cache[range] ?? null

  function selectRange(next: ChartRange) {
    setRange(next)
    if (cache[next]) return

    setLoading(true)
    fetch(`/api/history?symbol=${encodeURIComponent(symbol)}&range=${next}`)
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error())
      )
      .then((data: PriceHistory) => {
        setCache((current) => ({ ...current, [next]: data }))
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Évolution du cours</CardTitle>
        <div className="flex gap-1">
          {RANGES.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={option.value === range ? "default" : "ghost"}
              onClick={() => selectRange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {history && history.points.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <AreaChart data={history.points} margin={{ left: 4, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                minTickGap={48}
                tickMargin={8}
                tickFormatter={(value: string) =>
                  dateFormatter.format(new Date(value))
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                domain={["auto", "auto"]}
                tickFormatter={(value: number) => value.toFixed(0)}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="close"
                type="monotone"
                stroke="var(--color-close)"
                fill="var(--color-close)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <p className="text-muted-foreground py-20 text-center text-sm">
            {loading ? "Chargement…" : "Historique du cours indisponible."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
