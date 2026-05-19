import type { Metadata } from "next"

import { Button } from "@/components/ui/button"
import { WatchlistDialog } from "@/components/watchlist/watchlist-dialog"
import { WatchlistItemCard } from "@/components/watchlist/watchlist-item-card"
import { getWatchlist } from "@/features/watchlist/queries"

export const metadata: Metadata = { title: "Watchlist" }

export default async function WatchlistPage() {
  const { rows, quotesError } = await getWatchlist()

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
          <p className="text-muted-foreground text-sm">
            Suivez des actions non encore achetées et obtenez un point
            d&apos;entrée recommandé par l&apos;IA.
          </p>
        </div>
        <WatchlistDialog
          trigger={<Button>Ajouter une action</Button>}
        />
      </header>

      {quotesError ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {quotesError} Les valeurs affichées peuvent être incomplètes.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Aucune action surveillée. Ajoutez-en une pour obtenir une
          recommandation de point d&apos;entrée.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <WatchlistItemCard key={row.item.id} row={row} />
          ))}
        </div>
      )}
    </div>
  )
}
