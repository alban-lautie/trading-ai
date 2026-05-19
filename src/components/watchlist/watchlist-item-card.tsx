import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EntryAlertSwitch } from "@/components/watchlist/entry-alert-switch"
import { GenerateEntryButton } from "@/components/watchlist/generate-entry-button"
import { WatchlistItemActions } from "@/components/watchlist/watchlist-item-actions"
import {
  CONVICTION_LABELS,
  ENTRY_ACTION_LABELS,
} from "@/features/watchlist/labels"
import type { WatchlistItemWithQuote } from "@/features/watchlist/queries"
import { formatCurrency, formatGenerationDate, formatPercent } from "@/lib/format"

interface WatchlistItemCardProps {
  row: WatchlistItemWithQuote
}

/** A single watched stock with its AI entry-point recommendation. */
export function WatchlistItemCard({ row }: WatchlistItemCardProps) {
  const { item, quote, entryGapPercent, entryAlertActive } = row
  const currency = item.currency
  const hasReco = item.recommendation_generated_at !== null

  const actionStyle =
    item.entry_action === "buy_now"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700"

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.symbol}</CardTitle>
        {item.name ? (
          <p className="text-muted-foreground text-xs">{item.name}</p>
        ) : null}
        <CardAction>
          <WatchlistItemActions item={item} />
        </CardAction>
      </CardHeader>

      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between gap-4 border-b pb-2">
          <span className="text-muted-foreground text-sm">Cours actuel</span>
          <span className="text-sm font-medium tabular-nums">
            {quote ? (
              formatCurrency(quote.price, quote.currency)
            ) : (
              <span className="text-muted-foreground">indisponible</span>
            )}
          </span>
        </div>

        {hasReco && item.entry_action ? (
          <>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${actionStyle}`}
              >
                {ENTRY_ACTION_LABELS[item.entry_action]}
              </span>
              {item.conviction ? (
                <span className="text-muted-foreground text-xs">
                  Conviction : {CONVICTION_LABELS[item.conviction]}
                </span>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-sm">
                Prix d&apos;entrée conseillé
              </span>
              <span className="text-sm font-medium tabular-nums">
                {item.recommended_entry_price !== null ? (
                  formatCurrency(
                    Number(item.recommended_entry_price),
                    currency
                  )
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-sm">
                Écart cours / entrée
              </span>
              <span className="text-sm font-medium tabular-nums">
                {entryGapPercent !== null ? (
                  formatPercent(entryGapPercent)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
            </div>

            {item.rationale ? (
              <p className="text-muted-foreground text-sm">{item.rationale}</p>
            ) : null}

            <p className="text-muted-foreground text-xs">
              Recommandation du{" "}
              {formatGenerationDate(item.recommendation_generated_at!)}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Aucune recommandation pour le moment. Générez-la pour obtenir un
            point d&apos;entrée.
          </p>
        )}
      </CardContent>

      <CardFooter className="flex-wrap justify-between gap-3">
        <GenerateEntryButton itemId={item.id} hasRecommendation={hasReco} />
        {hasReco && item.recommended_entry_price !== null ? (
          <EntryAlertSwitch
            itemId={item.id}
            initialActive={entryAlertActive}
          />
        ) : null}
      </CardFooter>
    </Card>
  )
}
