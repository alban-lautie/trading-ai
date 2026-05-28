import type { Metadata } from "next"

import { GenerateAllRecommendationsButton } from "@/components/dashboard/generate-all-recommendations-button"
import { PortfolioValueChart } from "@/components/dashboard/portfolio-value-chart"
import { PortfolioSummaryCards } from "@/components/positions/portfolio-summary-cards"
import { PositionDialog } from "@/components/positions/position-dialog"
import { PositionsTable } from "@/components/positions/positions-table"
import { SalesStatsCard } from "@/components/sales/sales-stats-card"
import { SalesTable } from "@/components/sales/sales-table"
import { Button } from "@/components/ui/button"
import { getPortfolioValueHistory } from "@/features/dashboard/queries"
import { getPortfolio } from "@/features/positions/queries"
import { getSalesOverview } from "@/features/sales/queries"

export const metadata: Metadata = { title: "Tableau de bord" }

export default async function DashboardPage() {
  const [{ rows, summary, quotesError }, valueHistory, salesOverview] =
    await Promise.all([
      getPortfolio(),
      getPortfolioValueHistory(),
      getSalesOverview(),
    ])

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tableau de bord
        </h1>
        <div className="flex items-center gap-2">
          <GenerateAllRecommendationsButton />
          <PositionDialog trigger={<Button>Ajouter une position</Button>} />
        </div>
      </header>

      {quotesError ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {quotesError} Les valeurs affichées peuvent être incomplètes.
        </p>
      ) : null}

      <PortfolioSummaryCards summary={summary} />

      <PortfolioValueChart points={valueHistory} />

      <PositionsTable rows={rows} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Performance des ventes
        </h2>
        <SalesStatsCard overview={salesOverview} />
        <SalesTable sales={salesOverview.sales} />
      </section>
    </div>
  )
}
