import type { Metadata } from "next"

import { CsvImportDialog } from "@/components/positions/csv-import-dialog"
import { PositionDialog } from "@/components/positions/position-dialog"
import { PositionsTable } from "@/components/positions/positions-table"
import { Button } from "@/components/ui/button"
import { getPortfolio } from "@/features/positions/queries"

export const metadata: Metadata = { title: "Positions" }

export default async function PositionsPage() {
  const { rows, quotesError } = await getPortfolio()

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Positions</h1>
          <p className="text-muted-foreground text-sm">
            Gérez les actions de votre portefeuille.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportDialog
            trigger={<Button variant="outline">Importer un CSV</Button>}
          />
          <PositionDialog trigger={<Button>Ajouter une position</Button>} />
        </div>
      </header>

      {quotesError ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {quotesError} Les valeurs affichées peuvent être incomplètes.
        </p>
      ) : null}

      <PositionsTable rows={rows} />
    </div>
  )
}
