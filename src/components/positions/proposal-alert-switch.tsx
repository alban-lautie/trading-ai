"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Switch } from "@/components/ui/switch"
import { setProposalAlert } from "@/features/alerts/actions"

interface ProposalAlertSwitchProps {
  positionId: string
  kind: string
  alertType: string
  targetPrice: number
  initialActive: boolean
}

/** Switch that arms or disarms the alert for a position-action proposal. */
export function ProposalAlertSwitch({
  positionId,
  kind,
  alertType,
  targetPrice,
  initialActive,
}: ProposalAlertSwitchProps) {
  const [active, setActive] = useState(initialActive)
  const [isPending, startTransition] = useTransition()

  function handleToggle(next: boolean) {
    setActive(next)
    startTransition(async () => {
      const result = await setProposalAlert({
        positionId,
        kind,
        alertType,
        threshold: targetPrice,
        enabled: next,
      })
      if (result.error) {
        setActive(!next)
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
