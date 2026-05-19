"use client"

import { useTransition } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { WatchlistDialog } from "@/components/watchlist/watchlist-dialog"
import { Button } from "@/components/ui/button"
import { deleteWatchlistItem } from "@/features/watchlist/actions"
import type { Watchlist } from "@/lib/types"

interface WatchlistItemActionsProps {
  item: Watchlist
}

/** Edit and remove controls for a single watched stock. */
export function WatchlistItemActions({ item }: WatchlistItemActionsProps) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteWatchlistItem(item.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Action retirée de la watchlist")
    })
  }

  return (
    <div className="flex gap-1">
      <WatchlistDialog
        item={item}
        trigger={
          <Button variant="ghost" size="icon" aria-label="Modifier">
            <Pencil size={16} />
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Retirer"
        disabled={isPending}
        onClick={handleDelete}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  )
}
