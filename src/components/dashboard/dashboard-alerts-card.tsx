import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { AlertProximity } from "@/features/alerts/queries"
import { ALERT_TYPE_LABELS, isPercentAlertType } from "@/lib/alert-labels"
import type { Alert } from "@/lib/types"

interface DashboardAlertsCardProps {
  triggered: Alert[]
  upcoming: AlertProximity[]
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
})

function condition(alert: Alert): string {
  const unit = isPercentAlertType(alert.type) ? " %" : ""
  return `${ALERT_TYPE_LABELS[alert.type]} ${Number(alert.threshold)}${unit}`
}

/** Dashboard card listing triggered and soon-to-trigger alerts. */
export function DashboardAlertsCard({
  triggered,
  upcoming,
}: DashboardAlertsCardProps) {
  const hasAny = triggered.length > 0 || upcoming.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alertes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!hasAny ? (
          <p className="text-muted-foreground text-sm">
            Aucune alerte déclenchée ni proche de son seuil.
          </p>
        ) : (
          <>
            <section className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium uppercase">
                Déclenchées
              </p>
              {triggered.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucune.</p>
              ) : (
                <ul className="space-y-2">
                  {triggered.map((alert) => (
                    <li
                      key={alert.id}
                      className="flex items-center justify-between gap-3 rounded-md border p-2.5"
                    >
                      <div className="text-sm">
                        <span className="font-medium">{alert.symbol}</span>
                        <span className="text-muted-foreground">
                          {" · "}
                          {condition(alert)}
                        </span>
                      </div>
                      <Badge className="bg-red-600 shrink-0">
                        {alert.triggered_at
                          ? dateFormatter.format(new Date(alert.triggered_at))
                          : "Déclenchée"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium uppercase">
                Bientôt déclenchées
              </p>
              {upcoming.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucune.</p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.map(({ alert, gap, imminent }) => (
                    <li
                      key={alert.id}
                      className="flex items-center justify-between gap-3 rounded-md border p-2.5"
                    >
                      <div className="text-sm">
                        <span className="font-medium">{alert.symbol}</span>
                        <span className="text-muted-foreground">
                          {" · "}
                          {condition(alert)}
                        </span>
                      </div>
                      {imminent ? (
                        <Badge className="bg-amber-500 shrink-0">
                          Imminent
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          à {gap.toFixed(1)}
                          {isPercentAlertType(alert.type) ? " pts" : " %"} du
                          seuil
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  )
}
