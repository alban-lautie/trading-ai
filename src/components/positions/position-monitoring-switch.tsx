"use client"

import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"

import { Switch } from "@/components/ui/switch"
import { setPositionMonitoring } from "@/features/positions/actions"

interface PositionMonitoringSwitchProps {
  positionId: string
  initialEnabled: boolean
}

/**
 * Switch that pauses or resumes everything that watches the position: alerts,
 * AI sell recommendations and inclusion in the daily AI summary. The position
 * itself stays visible and counts in portfolio totals either way.
 */
export function PositionMonitoringSwitch({
  positionId,
  initialEnabled,
}: PositionMonitoringSwitchProps) {
  const [isPending, startTransition] = useTransition()
  const [enabled, setEnabled] = useOptimistic(initialEnabled)

  function handleToggle(next: boolean) {
    startTransition(async () => {
      setEnabled(next)
      const result = await setPositionMonitoring(positionId, next)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(
        next ? "Surveillance activée" : "Surveillance mise en pause"
      )
    })
  }

  return (
    <label className="flex items-center gap-2">
      <Switch
        checked={enabled}
        disabled={isPending}
        onCheckedChange={handleToggle}
        aria-label="Activer la surveillance de cette position"
      />
      <span className="text-muted-foreground text-xs">
        Surveiller cette action
      </span>
    </label>
  )
}
