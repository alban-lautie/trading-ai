"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

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
import type { ValuePoint } from "@/features/dashboard/queries"

interface PortfolioValueChartProps {
  points: ValuePoint[]
}

const chartConfig = {
  value: { label: "Valeur", color: "var(--chart-1)" },
} satisfies ChartConfig

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
})

/** Reconstructed portfolio value curve over the last 6 months. */
export function PortfolioValueChart({ points }: PortfolioValueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Valeur du portefeuille</CardTitle>
      </CardHeader>
      <CardContent>
        {points.length > 1 ? (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <AreaChart data={points} margin={{ left: 4, right: 8 }}>
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
                width={64}
                domain={["auto", "auto"]}
                tickFormatter={(value: number) => value.toFixed(0)}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="value"
                type="monotone"
                stroke="var(--color-value)"
                fill="var(--color-value)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <p className="text-muted-foreground py-20 text-center text-sm">
            Pas encore assez de données pour tracer la courbe.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
