import { AlertItem } from "@/components/alerts/alert-item"
import type { Alert } from "@/lib/types"

interface AlertsListProps {
  alerts: Alert[]
}

/** Renders the user's alerts, or an empty state. */
export function AlertsList({ alerts }: AlertsListProps) {
  if (alerts.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Aucune alerte. Créez-en une pour être notifié sur Telegram.
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} />
      ))}
    </div>
  )
}
