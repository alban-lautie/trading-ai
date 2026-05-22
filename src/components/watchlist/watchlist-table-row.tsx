"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { EntryAlertSwitch } from "@/components/watchlist/entry-alert-switch"
import { GenerateEntryButton } from "@/components/watchlist/generate-entry-button"
import { WatchlistItemActions } from "@/components/watchlist/watchlist-item-actions"
import {
  CONVICTION_LABELS,
  ENTRY_ACTION_LABELS,
} from "@/features/watchlist/labels"
import type { WatchlistItemWithQuote } from "@/features/watchlist/queries"
import { formatCurrency, formatGenerationDate, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

interface WatchlistTableRowProps {
  row: WatchlistItemWithQuote
}

/** Total column count, kept in sync with the header in `watchlist-table`. */
const COLUMN_COUNT = 10

/** A watched stock row whose AI rationale expands in an accordion on click. */
export function WatchlistTableRow({ row }: WatchlistTableRowProps) {
  const [expanded, setExpanded] = useState(false)
  const { item, quote, entryGapPercent, entryAlertActive } = row
  const currency = item.currency
  const hasReco = item.recommendation_generated_at !== null
  const rationale = item.rationale?.trim() ?? ""
  const canExpand = rationale.length > 0

  function toggle() {
    setExpanded((value) => !value)
  }

  return (
    <>
      <TableRow
        className={cn("hover:bg-muted/60", canExpand && "cursor-pointer")}
        onClick={canExpand ? toggle : undefined}
      >
        <TableCell className="w-8">
          {canExpand ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={
                expanded
                  ? "Masquer la recommandation"
                  : "Afficher la recommandation"
              }
              onClick={(event) => {
                event.stopPropagation()
                toggle()
              }}
              className="text-muted-foreground hover:text-foreground flex"
            >
              <ChevronDown
                size={16}
                className={cn(
                  "transition-transform",
                  expanded && "rotate-180"
                )}
              />
            </button>
          ) : null}
        </TableCell>

        <TableCell>
          <div className="font-medium">{item.symbol}</div>
          {item.name ? (
            <div className="text-muted-foreground text-xs">{item.name}</div>
          ) : null}
        </TableCell>

        <TableCell className="text-right tabular-nums">
          {quote ? (
            formatCurrency(quote.price, quote.currency)
          ) : (
            <span className="text-muted-foreground">indisponible</span>
          )}
        </TableCell>

        <TableCell>
          {hasReco && item.entry_action ? (
            <Badge
              variant="outline"
              className={cn(
                item.entry_action === "buy_now"
                  ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                  : "border-amber-200 bg-amber-100 text-amber-700"
              )}
            >
              {ENTRY_ACTION_LABELS[item.entry_action]}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        <TableCell>
          {item.conviction ? (
            CONVICTION_LABELS[item.conviction]
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        <TableCell className="text-right tabular-nums">
          {item.recommended_entry_price !== null ? (
            formatCurrency(Number(item.recommended_entry_price), currency)
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        <TableCell className="text-right tabular-nums">
          {entryGapPercent !== null ? (
            formatPercent(entryGapPercent)
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        <TableCell className="text-muted-foreground text-xs">
          {item.recommendation_generated_at
            ? formatGenerationDate(item.recommendation_generated_at)
            : "—"}
        </TableCell>

        <TableCell onClick={(event) => event.stopPropagation()}>
          {hasReco && item.recommended_entry_price !== null ? (
            <EntryAlertSwitch
              itemId={item.id}
              initialActive={entryAlertActive}
              hideLabel
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        <TableCell onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            <GenerateEntryButton itemId={item.id} hasRecommendation={hasReco} />
            <WatchlistItemActions item={item} />
          </div>
        </TableCell>
      </TableRow>

      {canExpand && expanded ? (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={COLUMN_COUNT} className="bg-muted/30">
            <div className="space-y-1 px-2 py-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Analyse de l&apos;IA
              </p>
              <p className="text-sm whitespace-normal">{rationale}</p>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  )
}
