import type { Metadata } from "next"

import { DailySummaryCard } from "@/components/dashboard/daily-summary-card"
import { DashboardAlertsCard } from "@/components/dashboard/dashboard-alerts-card"
import { PortfolioValueChart } from "@/components/dashboard/portfolio-value-chart"
import { PortfolioSummaryCards } from "@/components/positions/portfolio-summary-cards"
import { PositionDialog } from "@/components/positions/position-dialog"
import { PositionsTable } from "@/components/positions/positions-table"
import { Button } from "@/components/ui/button"
import { getAlertsOverview } from "@/features/alerts/queries"
import {
  getDailySummary,
  getPortfolioValueHistory,
} from "@/features/dashboard/queries"
import { getPortfolio } from "@/features/positions/queries"

export const metadata: Metadata = { title: "Tableau de bord" }

export default async function DashboardPage() {
  const [
    { rows, summary, quotesError },
    valueHistory,
    dailySummary,
    alertsOverview,
  ] = await Promise.all([
    getPortfolio(),
    getPortfolioValueHistory(),
    getDailySummary(),
    getAlertsOverview(),
  ])

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tableau de bord
        </h1>
        <PositionDialog trigger={<Button>Ajouter une position</Button>} />
      </header>

      {quotesError ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {quotesError} Les valeurs affichées peuvent être incomplètes.
        </p>
      ) : null}

      <PortfolioSummaryCards summary={summary} />

      <PortfolioValueChart points={valueHistory} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DailySummaryCard initialSummary={dailySummary} />
        <DashboardAlertsCard
          triggered={alertsOverview.triggered}
          upcoming={alertsOverview.upcoming}
        />
      </div>

      <PositionsTable rows={rows} />
    </div>
  )
}
