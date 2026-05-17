import type { PositionWithMetrics } from "@/lib/portfolio"
import type { AlertType, PositionRecommendation, SellTarget } from "@/lib/types"

/**
 * Position-action proposals.
 *
 * Proposals are derived from the position's stored AI recommendation: each
 * sell tier and the protective stop become armable price levels. When no
 * recommendation has been generated yet, a small set of heuristic proposals
 * is shown as a placeholder until the first AI run.
 */

/** Visual / behavioural family of a proposal. */
export type ProposalCategory = "take_profit" | "stop_loss" | "reinforce" | "hold"

export interface PositionProposal {
  /** Stable key, also used as the alert's `proposal_kind` tag. */
  kind: string
  /** Family the proposal belongs to. */
  category: ProposalCategory
  title: string
  rationale: string
  /** Suggested price level, when the proposal targets one. */
  targetPrice: number | null
  /** Share of the position to sell, for take-profit tiers. */
  percent: number | null
  /** Alert condition this proposal arms, or null when it has no alert. */
  alertType: AlertType | null
}

/** Reads the sell tiers stored on a recommendation, tolerating bad data. */
function readSellTargets(value: unknown): SellTarget[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is SellTarget =>
      !!item &&
      typeof item === "object" &&
      typeof (item as SellTarget).price === "number" &&
      typeof (item as SellTarget).percent === "number"
  )
}

/** Builds the proposals carried by an AI recommendation. */
function buildRecommendationProposals(
  recommendation: PositionRecommendation
): PositionProposal[] {
  const targets = readSellTargets(recommendation.sell_targets)
  const proposals: PositionProposal[] = []

  targets.forEach((target, index) => {
    const tier = index + 1
    const share = `${Math.round(target.percent)} %`
    proposals.push({
      kind: `take_profit_${tier}`,
      category: "take_profit",
      title:
        targets.length > 1
          ? `Palier de vente ${tier}/${targets.length}`
          : "Objectif de vente",
      rationale: `Vendre ${share} de la position à l'approche de ce cours, niveau déterminé par l'IA à partir de votre intention.`,
      targetPrice: target.price,
      percent: target.percent,
      alertType: "price_above",
    })
  })

  if (recommendation.stop_loss_price !== null) {
    proposals.push({
      kind: "stop_loss",
      category: "stop_loss",
      title: "Stop de protection",
      rationale:
        "Seuil sous lequel l'IA recommande de couper la position pour limiter la perte.",
      targetPrice: Number(recommendation.stop_loss_price),
      percent: null,
      alertType: "price_below",
    })
  }

  return proposals
}

/** Builds the heuristic placeholder proposals used before the first AI run. */
function buildHeuristicProposals(
  metrics: PositionWithMetrics
): PositionProposal[] {
  const averagePrice = Number(metrics.position.average_price)
  const price = metrics.quote?.price ?? null
  const pnl = metrics.unrealizedPnlPercent

  return [
    {
      kind: "take_profit",
      category: "take_profit",
      title: "Prendre une partie des bénéfices",
      rationale:
        pnl !== null && pnl > 0
          ? `Position en plus-value de ${(pnl * 100).toFixed(1)} %. Alléger 25 à 50 % de la ligne à l'approche de ce niveau permettrait de sécuriser le gain.`
          : "Fixer un objectif de sortie partielle pour sécuriser un gain dès que le cours franchit ce niveau.",
      targetPrice: averagePrice * 1.2,
      percent: null,
      alertType: "price_above",
    },
    {
      kind: "stop_loss",
      category: "stop_loss",
      title: "Placer un stop de protection",
      rationale:
        "Couper la position sous ce niveau limiterait la perte à environ 10 % du prix d'achat.",
      targetPrice: averagePrice * 0.9,
      percent: null,
      alertType: "price_below",
    },
    {
      kind: "reinforce",
      category: "reinforce",
      title: "Renforcer à la baisse",
      rationale:
        "Si la thèse d'investissement reste valable, un renfort à ce niveau abaisserait le prix de revient moyen.",
      targetPrice: averagePrice * 0.95,
      percent: null,
      alertType: "price_below",
    },
    {
      kind: "hold",
      category: "hold",
      title: "Conserver la position",
      rationale:
        price !== null
          ? `Cours actuel ${price.toFixed(2)}. Tant qu'il évolue entre le stop et l'objectif, conserver sans intervenir.`
          : "Conserver tant que le cours évolue entre le stop et l'objectif.",
      targetPrice: null,
      percent: null,
      alertType: null,
    },
  ]
}

/**
 * Builds the position-action proposals. When an AI recommendation exists it
 * drives the proposals; otherwise heuristic placeholders are returned.
 */
export function buildPositionProposals(
  metrics: PositionWithMetrics,
  recommendation: PositionRecommendation | null
): PositionProposal[] {
  if (recommendation) {
    return buildRecommendationProposals(recommendation)
  }
  return buildHeuristicProposals(metrics)
}
