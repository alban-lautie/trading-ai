import type { Metadata } from "next"

import { AlertsList } from "@/components/alerts/alerts-list"
import { CreateAlertDialog } from "@/components/alerts/create-alert-dialog"
import { getAlerts } from "@/features/alerts/queries"

export const metadata: Metadata = { title: "Alertes" }

export default async function AlertsPage() {
  const alerts = await getAlerts()

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alertes</h1>
          <p className="text-muted-foreground text-sm">
            Surveillez le cours et la variation de vos actions.
          </p>
        </div>
        <CreateAlertDialog />
      </header>

      <AlertsList alerts={alerts} />
    </div>
  )
}
