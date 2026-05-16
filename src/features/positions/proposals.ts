import type { PositionWithMetrics } from "@/lib/portfolio"

/**
 * Position-action proposals.
 *
 * NOTE: this is MOCK data for now — the proposals are simple heuristics
 * derived from the position (purchase price, current price, P/L), not the
 * output of a real strategy engine. Replace `buildPositionProposals` with the
 * real engine when it is available; the `PositionProposal` shape can stay.
 */

export type ProposalKind = "take_profit" | "stop_loss" | "reinforce" | "hold"

export interface PositionProposal {
  kind: ProposalKind
  title: string
  rationale: string
  /** Suggested price level, when the proposal targets one. */
  targetPrice: number | null
}

/** Builds mock position-action proposals from the position's figures. */
export function buildPositionProposals(
  metrics: PositionWithMetrics
): PositionProposal[] {
  const averagePrice = Number(metrics.position.average_price)
  const price = metrics.quote?.price ?? null
  const pnl = metrics.unrealizedPnlPercent

  return [
    {
      kind: "take_profit",
      title: "Prendre une partie des bénéfices",
      rationale:
        pnl !== null && pnl > 0
          ? `Position en plus-value de ${(pnl * 100).toFixed(1)} %. Alléger 25 à 50 % de la ligne à l'approche de ce niveau permettrait de sécuriser le gain.`
          : "Fixer un objectif de sortie partielle pour sécuriser un gain dès que le cours franchit ce niveau.",
      targetPrice: averagePrice * 1.2,
    },
    {
      kind: "stop_loss",
      title: "Placer un stop de protection",
      rationale:
        "Couper la position sous ce niveau limiterait la perte à environ 10 % du prix d'achat.",
      targetPrice: averagePrice * 0.9,
    },
    {
      kind: "reinforce",
      title: "Renforcer à la baisse",
      rationale:
        "Si la thèse d'investissement reste valable, un renfort à ce niveau abaisserait le prix de revient moyen.",
      targetPrice: averagePrice * 0.95,
    },
    {
      kind: "hold",
      title: "Conserver la position",
      rationale:
        price !== null
          ? `Cours actuel ${price.toFixed(2)}. Tant qu'il évolue entre le stop et l'objectif, conserver sans intervenir.`
          : "Conserver tant que le cours évolue entre le stop et l'objectif.",
      targetPrice: null,
    },
  ]
}
