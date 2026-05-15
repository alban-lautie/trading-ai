import type { Metadata } from "next"

import { AlertsList } from "@/components/alerts/alerts-list"
import { CreateAlertDialog } from "@/components/alerts/create-alert-dialog"
import { TelegramConnect } from "@/components/notifications/telegram-connect"
import { getAlerts } from "@/features/alerts/queries"
import { getNotificationSettings } from "@/features/notifications/queries"

export const metadata: Metadata = { title: "Alertes" }

export default async function AlertsPage() {
  const [alerts, notificationSettings] = await Promise.all([
    getAlerts(),
    getNotificationSettings(),
  ])

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alertes</h1>
          <p className="text-muted-foreground text-sm">
            Surveillez vos actions et recevez les alertes sur Telegram.
          </p>
        </div>
        <CreateAlertDialog />
      </header>

      <TelegramConnect settings={notificationSettings} />

      <AlertsList alerts={alerts} />
    </div>
  )
}
