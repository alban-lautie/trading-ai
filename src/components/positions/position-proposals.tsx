import type { LucideIcon } from "lucide-react"
import { Hand, Plus, ShieldAlert, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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

interface PositionProposalsProps {
  metrics: PositionWithMetrics
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

/** Suggested actions for the position (take profit, stop loss, …). */
export function PositionProposals({ metrics }: PositionProposalsProps) {
  const proposals = buildPositionProposals(metrics)
  const currency = metrics.position.currency

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            Propositions de prise de position
          </CardTitle>
          <Badge variant="secondary">Données simulées</Badge>
        </div>
        <CardDescription>
          Suggestions indicatives — ce n&apos;est pas un conseil en
          investissement.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {proposals.map((proposal) => {
          const meta = KIND_META[proposal.kind]
          const Icon = meta.icon
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
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
