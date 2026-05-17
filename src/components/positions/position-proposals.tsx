import type { LucideIcon } from "lucide-react"
import { Hand, Plus, ShieldAlert, TrendingUp } from "lucide-react"

import { GenerateRecommendationButton } from "@/components/positions/generate-recommendation-button"
import { ProposalAlertSwitch } from "@/components/positions/proposal-alert-switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  buildPositionProposals,
  type ProposalKind,
} from "@/features/positions/proposals"
import { formatCurrency } from "@/lib/format"
import type { PositionWithMetrics } from "@/lib/portfolio"
import type {
  Alert,
  ConvictionLevel,
  PositionRecommendation,
  RecommendationAction,
} from "@/lib/types"

interface PositionProposalsProps {
  metrics: PositionWithMetrics
  alerts: Alert[]
  recommendation: PositionRecommendation | null
}

const KIND_META: Record<
  ProposalKind,
  { label: string; icon: LucideIcon; className: string }
> = {
  take_profit: {
    label: "Prise de bénéfices",
    icon: TrendingUp,
    className: "bg-emerald-600/10 text-emerald-600",
  },
  stop_loss: {
    label: "Protection",
    icon: ShieldAlert,
    className: "bg-red-600/10 text-red-600",
  },
  reinforce: {
    label: "Renfort",
    icon: Plus,
    className: "bg-primary/10 text-primary",
  },
  hold: {
    label: "Conservation",
    icon: Hand,
    className: "bg-muted text-muted-foreground",
  },
}

const ACTION_META: Record<
  RecommendationAction,
  { label: string; className: string }
> = {
  sell_now: {
    label: "Vendre maintenant",
    className: "bg-red-600/10 text-red-600",
  },
  reinforce: { label: "Renforcer", className: "bg-primary/10 text-primary" },
  hold: { label: "Conserver", className: "bg-muted text-muted-foreground" },
}

const CONVICTION_LABELS: Record<ConvictionLevel, string> = {
  low: "faible",
  medium: "modérée",
  high: "élevée",
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
})

/** AI sell recommendation for the position, with switches to arm alerts. */
export function PositionProposals({
  metrics,
  alerts,
  recommendation,
}: PositionProposalsProps) {
  const proposals = buildPositionProposals(metrics, recommendation)
  const currency = metrics.position.currency
  const positionId = metrics.position.id

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Recommandation de l&apos;IA</CardTitle>
          <GenerateRecommendationButton
            positionId={positionId}
            hasRecommendation={Boolean(recommendation)}
          />
        </div>
        <CardDescription>
          Les alertes Telegram sont posées automatiquement sur les niveaux
          recommandés ; vous pouvez les désactiver ici. Ce n&apos;est pas un
          conseil en investissement.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {recommendation ? (
          <div className="bg-muted/40 flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-2 py-1 text-xs font-semibold ${ACTION_META[recommendation.action].className}`}
              >
                {ACTION_META[recommendation.action].label}
              </span>
              <span className="text-muted-foreground text-xs">
                Conviction {CONVICTION_LABELS[recommendation.conviction]}
              </span>
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              {dateFormatter.format(new Date(recommendation.generated_at))}
            </span>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Aucune recommandation IA pour l&apos;instant. Les niveaux ci-dessous
            sont des repères indicatifs — générez une recommandation ou
            attendez la prochaine ouverture de marché.
          </p>
        )}
        {proposals.map((proposal) => {
          const meta = KIND_META[proposal.kind]
          const Icon = meta.icon
          const hasAlert =
            proposal.targetPrice !== null && proposal.alertType !== null
          const alertActive = alerts.some(
            (alert) => alert.proposal_kind === proposal.kind
          )

          return (
            <div
              key={proposal.kind}
              className="flex gap-3 rounded-lg border p-3"
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${meta.className}`}
              >
                <Icon className="size-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{proposal.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {meta.label}
                    </p>
                  </div>
                  {proposal.targetPrice !== null ? (
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(proposal.targetPrice, currency)}
                    </span>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {proposal.rationale}
                </p>
                {hasAlert ? (
                  <div className="border-t pt-2">
                    <ProposalAlertSwitch
                      positionId={positionId}
                      kind={proposal.kind}
                      alertType={proposal.alertType as string}
                      targetPrice={proposal.targetPrice as number}
                      initialActive={alertActive}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
