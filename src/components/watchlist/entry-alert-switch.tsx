"use client"

import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"

import { Switch } from "@/components/ui/switch"
import { setEntryAlert } from "@/features/watchlist/actions"

interface EntryAlertSwitchProps {
  itemId: string
  initialActive: boolean
  /** Disabled when no entry price has been recommended yet. */
  disabled?: boolean
  /** Renders the bare switch, without the descriptive text (e.g. in a table). */
  hideLabel?: boolean
}

/**
 * Switch that arms or disarms the Telegram alert fired when the quote reaches
 * the recommended entry price. The checked state is derived from the real
 * server state through `useOptimistic` so it stays correct after a
 * recommendation is generated and the page revalidates.
 */
export function EntryAlertSwitch({
  itemId,
  initialActive,
  disabled,
  hideLabel,
}: EntryAlertSwitchProps) {
  const [isPending, startTransition] = useTransition()
  const [active, setActive] = useOptimistic(initialActive)

  function handleToggle(next: boolean) {
    startTransition(async () => {
      setActive(next)
      const result = await setEntryAlert(itemId, next)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(next ? "Alerte activée" : "Alerte désactivée")
    })
  }

  const switchElement = (
    <Switch
      checked={active}
      disabled={isPending || disabled}
      onCheckedChange={handleToggle}
      aria-label="Activer l'alerte au point d'entrée"
    />
  )

  if (hideLabel) {
    return switchElement
  }

  return (
    <label className="flex items-center gap-2">
      {switchElement}
      <span className="text-muted-foreground text-xs">
        Alerte au point d&apos;entrée
      </span>
    </label>
  )
}
