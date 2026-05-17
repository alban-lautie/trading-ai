"use client"

import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"

import { Switch } from "@/components/ui/switch"
import { setProposalAlert } from "@/features/alerts/actions"

interface ProposalAlertSwitchProps {
  positionId: string
  kind: string
  alertType: string
  targetPrice: number
  percent: number | null
  initialActive: boolean
}

/**
 * Switch that arms or disarms the alert for a position-action proposal.
 *
 * The checked state is derived from `initialActive` (the real alert state on
 * the server) through `useOptimistic`, so it stays correct after a
 * recommendation is generated and the page revalidates — a plain `useState`
 * mirror would keep its stale initial value.
 */
export function ProposalAlertSwitch({
  positionId,
  kind,
  alertType,
  targetPrice,
  percent,
  initialActive,
}: ProposalAlertSwitchProps) {
  const [isPending, startTransition] = useTransition()
  const [active, setActive] = useOptimistic(initialActive)

  function handleToggle(next: boolean) {
    startTransition(async () => {
      setActive(next)
      const result = await setProposalAlert({
        positionId,
        kind,
        alertType,
        threshold: targetPrice,
        percent,
        enabled: next,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(next ? "Alerte activée" : "Alerte désactivée")
    })
  }

  return (
    <label className="flex items-center gap-2">
      <Switch
        checked={active}
        disabled={isPending}
        onCheckedChange={handleToggle}
        aria-label="Activer l'alerte sur cette proposition"
      />
      <span className="text-muted-foreground text-xs">
        Alerte sur ce niveau
      </span>
    </label>
  )
}
