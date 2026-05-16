"use client"

import { useTransition } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { deleteAlert, toggleAlert } from "@/features/alerts/actions"
import { ALERT_TYPE_LABELS, isPercentAlertType } from "@/lib/alert-labels"
import type { Alert } from "@/lib/types"

interface AlertItemProps {
  alert: Alert
}

/** A single alert row with active toggle and delete control. */
export function AlertItem({ alert }: AlertItemProps) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(isActive: boolean) {
    startTransition(async () => {
      const result = await toggleAlert(alert.id, isActive)
      if (result.error) toast.error(result.error)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAlert(alert.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Alerte supprimée")
    })
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{alert.symbol}</span>
          {alert.triggered_at ? (
            <Badge variant="secondary">Déclenchée</Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-sm">
          {ALERT_TYPE_LABELS[alert.type]} {Number(alert.threshold)}
          {isPercentAlertType(alert.type) ? " %" : ""}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          checked={alert.is_active}
          disabled={isPending}
          onCheckedChange={handleToggle}
          aria-label="Activer l'alerte"
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Supprimer"
          disabled={isPending}
          onClick={handleDelete}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  )
}
