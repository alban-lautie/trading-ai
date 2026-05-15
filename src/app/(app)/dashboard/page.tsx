import type { Metadata } from "next"

import { PortfolioSummaryCards } from "@/components/positions/portfolio-summary-cards"
import { PositionDialog } from "@/components/positions/position-dialog"
import { PositionsTable } from "@/components/positions/positions-table"
import { Button } from "@/components/ui/button"
import { getPortfolio } from "@/features/positions/queries"

export const metadata: Metadata = { title: "Tableau de bord" }

export default async function DashboardPage() {
  const { rows, summary, quotesError } = await getPortfolio()

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
      <PositionsTable rows={rows} />
    </div>
  )
}
