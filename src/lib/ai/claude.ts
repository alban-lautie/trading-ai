import "server-only"

import Anthropic from "@anthropic-ai/sdk"

import type {
  StockFundamentals,
  TechnicalIndicators,
} from "@/lib/market-data"
import type { PortfolioSummary, PositionWithMetrics } from "@/lib/portfolio"
import type {
  AiMonitoringConfig,
  ConvictionLevel,
  RecommendationAction,
  SellTarget,
} from "@/lib/types"

/**
 * Anthropic Claude integration powering the configurable AI monitoring of the
 * user's portfolio.
 */

const MODEL = "claude-sonnet-4-6"
const MAX_TOKENS = 1024

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured")
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

/**
 * Stable system instructions. Marked with `cache_control` so Anthropic
 * prompt caching can reuse it across every analysis request.
 */
const SYSTEM_PROMPT = `You are a portfolio monitoring assistant for a stock-tracking app.
You receive a snapshot of a user's equity portfolio and produce a concise,
actionable analysis. You are not a licensed financial advisor: never give
direct buy/sell instructions, and remind the user that this is not financial
advice. Keep the response under 250 words, in plain paragraphs.`

interface AnalysisInput {
  config: AiMonitoringConfig
  summary: PortfolioSummary
  positions: PositionWithMetrics[]
}

function buildUserPrompt({ config, summary, positions }: AnalysisInput): string {
  const holdings = positions
    .map((row) => {
      const value = row.marketValue ?? row.costBasis
      const pnl = row.unrealizedPnlPercent
      const pnlText = pnl === null ? "n/a" : `${(pnl * 100).toFixed(2)}%`
      return `- ${row.position.symbol}: ${row.position.quantity} shares, value ${value.toFixed(2)} ${row.position.currency}, P/L ${pnlText}`
    })
    .join("\n")

  return `Analyse this portfolio.

Tone: ${config.tone}
Focus areas: ${config.focus_areas.join(", ")}

Totals:
- Cost basis: ${summary.costBasis.toFixed(2)}
- Market value: ${summary.marketValue.toFixed(2)}
- Unrealized P/L: ${summary.unrealizedPnl.toFixed(2)} (${(summary.unrealizedPnlPercent * 100).toFixed(2)}%)

Holdings:
${holdings || "(no holdings)"}`
}

/**
 * Generates a portfolio analysis with Claude based on the user's AI
 * monitoring configuration. Returns the analysis text.
 */
export async function generatePortfolioAnalysis(
  input: AnalysisInput
): Promise<string> {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  })

  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim()
}

/** Stable system instructions for the per-position insight. */
const POSITION_SYSTEM_PROMPT = `Tu es un assistant d'aide à la décision pour une
application de suivi de portefeuille. Tu reçois une position (une action
détenue par l'utilisateur) et tu produis une lecture courte et concrète : la
tendance, le positionnement du cours dans son range 52 semaines, le niveau
d'entrée de l'utilisateur, et les points de vigilance. Tu n'es pas conseiller
financier : ne donne jamais d'ordre d'achat ou de vente explicite et rappelle
que ce n'est pas un conseil en investissement. Réponds en français, en moins
de 180 mots, en paragraphes simples.`

export interface PositionInsightInput {
  symbol: string
  name: string | null
  quantity: number
  averagePrice: number
  currentPrice: number | null
  currency: string
  unrealizedPnlPercent: number | null
  fiftyTwoWeekHigh: number | null
  fiftyTwoWeekLow: number | null
}

/** Generates a short, decision-oriented insight for a single position. */
export async function generatePositionInsight(
  input: PositionInsightInput
): Promise<string> {
  const pnl =
    input.unrealizedPnlPercent === null
      ? "n/a"
      : `${(input.unrealizedPnlPercent * 100).toFixed(2)} %`

  const userPrompt = `Analyse cette position.

Action : ${input.symbol}${input.name ? ` (${input.name})` : ""}
Quantité : ${input.quantity}
Prix d'achat moyen : ${input.averagePrice} ${input.currency}
Cours actuel : ${input.currentPrice ?? "indisponible"} ${input.currency}
Plus/moins-value latente : ${pnl}
Plus haut 52 semaines : ${input.fiftyTwoWeekHigh ?? "n/a"}
Plus bas 52 semaines : ${input.fiftyTwoWeekLow ?? "n/a"}`

  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: POSITION_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  })

  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim()
}

/** Stable system instructions for the per-position sell recommendation. */
const RECOMMENDATION_SYSTEM_PROMPT = `Tu es un moteur de recommandation pour une
application de suivi de portefeuille d'actions. Pour une position donnée, tu
détermines l'action recommandée et des niveaux de prix concrets, en tenant
compte de l'intention de l'utilisateur sur cette position, du cours et de sa
dynamique, de la volatilité, des indicateurs techniques, des fondamentaux, des
objectifs de cours des analystes, des actualités récentes et du poids de la
ligne dans le portefeuille.

Règles :
- Aligne la recommandation sur l'intention : un objectif « Gain rapide » avec un
  horizon court justifie des paliers de vente plus proches du cours ; un
  objectif « Long terme » laisse plus de marge à la hausse.
- Découpe la sortie en 1 à 3 paliers de vente (sell_targets), classés du prix
  le plus proche au plus lointain ; chaque palier vend un pourcentage de la
  position et les pourcentages somment exactement à 100.
- Réserve plusieurs paliers aux lignes dont la valeur le justifie : pour une
  position de faible valeur absolue, le fractionnement n'a pas d'intérêt (frais,
  titres parfois non fractionnables) — renvoie alors un seul palier à 100 %.
- Si l'utilisateur a fixé un gain cible, le palier le plus lointain vise au
  moins ce gain par rapport au prix d'achat moyen, sauf si le contexte le rend
  irréaliste.
- Les paliers de vente sont supérieurs au cours actuel ; le stop de protection
  est inférieur au cours actuel.
- Appuie-toi sur l'objectif de cours moyen des analystes et sur les résistances
  récentes pour fixer des paliers réalistes ; ne t'en écarte pas fortement sans
  raison tirée des autres données.
- Cale le stop de protection sous un support récent, ou à environ 1,5 à 2 fois
  l'ATR sous le cours, en resserrant pour une tolérance au risque faible.
- Un RSI supérieur à 70 signale un titre suracheté (objectif de vente plus
  proche) ; inférieur à 30, un titre survendu. Un cours sous sa moyenne mobile
  200 jours traduit une tendance de fond baissière, au-dessus une tendance
  haussière. Un PER nettement élevé invite à la prudence sur le potentiel.
- action = "sell_now" si le cours a déjà atteint un niveau de sortie
  raisonnable ; "reinforce" si un renfort à la baisse est pertinent ; sinon
  "hold".
- conviction reflète ta confiance compte tenu des données disponibles : des
  données fondamentales ou d'analystes manquantes la réduisent.
- Une ligne très surpondérée (> 25 % du portefeuille) justifie un allègement
  plus prudent.
- Si le cours est indisponible, renvoie une liste sell_targets vide et le stop
  à null.

Réponds uniquement en appelant l'outil submit_recommendation. Ces
recommandations sont une aide à la décision, pas un conseil en investissement
réglementé.`

const RECOMMENDATION_TOOL: Anthropic.Tool = {
  name: "submit_recommendation",
  description: "Enregistre la recommandation de vente pour la position analysée.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["sell_now", "hold", "reinforce"],
        description:
          "sell_now : vendre/alléger maintenant. reinforce : renforcer à la baisse. hold : conserver.",
      },
      sell_targets: {
        type: "array",
        description:
          "Paliers de vente, du prix le plus proche au plus lointain : 1 à 3 paliers dont les pourcentages somment à 100. Liste vide si le cours est indisponible.",
        items: {
          type: "object",
          properties: {
            price: {
              type: "number",
              description: "Prix du palier, dans la devise de la position.",
            },
            percent: {
              type: "number",
              description:
                "Part de la position à vendre à ce palier, en pourcentage (1 à 100).",
            },
          },
          required: ["price", "percent"],
        },
      },
      stop_loss_price: {
        type: ["number", "null"],
        description:
          "Prix de protection sous lequel couper la position. null si le cours est indisponible.",
      },
      conviction: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Niveau de confiance dans la recommandation.",
      },
    },
    required: ["action", "sell_targets", "stop_loss_price", "conviction"],
  },
}

/** A recent news article passed to the recommendation prompt. */
export interface RecommendationNewsItem {
  title: string
  publisher: string
  /** Whole days since publication. */
  ageDays: number
}

export interface PositionRecommendationInput {
  symbol: string
  name: string | null
  quantity: number
  averagePrice: number
  currency: string
  openedAt: string
  /** Investment intent, already translated to human labels. */
  objective: string
  horizon: string
  riskTolerance: string
  targetGainPercent: number | null
  currentPrice: number | null
  /** Current market value of the position, used to judge tier splitting. */
  positionValue: number | null
  dayChangePercent: number | null
  fiftyTwoWeekHigh: number | null
  fiftyTwoWeekLow: number | null
  /** Annualized volatility in percent, when computable. */
  volatilityPercent: number | null
  /** Technical indicators, or `null` when the history is too short. */
  indicators: TechnicalIndicators | null
  /** Fundamentals and analyst data (fields may be `null`). */
  fundamentals: StockFundamentals
  news: RecommendationNewsItem[]
  portfolioTotalValue: number
  portfolioPnlPercent: number
  positionCount: number
  /** Share of the portfolio held in this position, in percent. */
  weightPercent: number | null
}

export interface PositionRecommendationResult {
  action: RecommendationAction
  sellTargets: SellTarget[]
  stopLossPrice: number | null
  conviction: ConvictionLevel
}

function buildRecommendationPrompt(input: PositionRecommendationInput): string {
  const pct = (value: number | null, digits = 2) =>
    value === null ? "n/a" : `${value.toFixed(digits)} %`
  const num = (value: number | null | undefined) =>
    value === null || value === undefined ? "n/a" : value.toFixed(2)

  const indicators = input.indicators
  const f = input.fundamentals

  const marketCap =
    f.marketCap === null
      ? "n/a"
      : `${(f.marketCap / 1e9).toFixed(1)} Md ${input.currency}`
  const dividendYield =
    f.dividendYield === null
      ? "n/a"
      : `${(f.dividendYield * 100).toFixed(2)} %`
  const analystCount = f.numberOfAnalysts
    ? ` (${f.numberOfAnalysts} analystes)`
    : ""

  const news =
    input.news.length > 0
      ? input.news
          .map((item) => {
            const age =
              item.ageDays <= 0
                ? "aujourd'hui"
                : `il y a ${item.ageDays} j`
            return `- [${age}, ${item.publisher}] ${item.title}`
          })
          .join("\n")
      : "(aucune actualité récente)"

  return `Analyse cette position et soumets une recommandation.

Position : ${input.symbol}${input.name ? ` (${input.name})` : ""}
Quantité : ${input.quantity}
Prix d'achat moyen : ${input.averagePrice} ${input.currency}
Date d'achat : ${input.openedAt}
Cours actuel : ${num(input.currentPrice)} ${input.currency}
Valeur actuelle de la position : ${num(input.positionValue)} ${input.currency}
Variation du jour : ${pct(input.dayChangePercent)}
Plus haut 52 semaines : ${num(input.fiftyTwoWeekHigh)}
Plus bas 52 semaines : ${num(input.fiftyTwoWeekLow)}
Volatilité annualisée : ${pct(input.volatilityPercent, 1)}

Intention de l'utilisateur :
- Objectif : ${input.objective}
- Horizon : ${input.horizon}
- Tolérance au risque : ${input.riskTolerance}
- Gain cible : ${input.targetGainPercent === null ? "non fixé" : `${input.targetGainPercent} %`}

Indicateurs techniques :
- Moyenne mobile 50 jours : ${num(indicators?.sma50)}
- Moyenne mobile 200 jours : ${num(indicators?.sma200)}
- RSI 14 : ${indicators?.rsi14 == null ? "n/a" : indicators.rsi14.toFixed(0)}
- ATR 14 (volatilité absolue) : ${num(indicators?.atr14)}
- Support récent (plus bas 20 jours) : ${num(indicators?.recentLow)}
- Résistance récente (plus haut 20 jours) : ${num(indicators?.recentHigh)}

Objectifs des analystes :
- Objectif de cours moyen : ${num(f.targetMeanPrice)} ${input.currency}
- Fourchette : ${num(f.targetLowPrice)} – ${num(f.targetHighPrice)} ${input.currency}
- Consensus : ${f.recommendationKey ?? "n/a"}${analystCount}

Fondamentaux :
- PER : ${num(f.trailingPE)}
- PER prévisionnel : ${num(f.forwardPE)}
- BPA : ${num(f.trailingEps)}
- Capitalisation : ${marketCap}
- Rendement du dividende : ${dividendYield}
- Bêta : ${num(f.beta)}

Contexte portefeuille :
- Valeur totale : ${input.portfolioTotalValue.toFixed(2)}
- Performance latente globale : ${pct(input.portfolioPnlPercent * 100)}
- Nombre de positions : ${input.positionCount}
- Poids de cette ligne : ${input.weightPercent === null ? "n/a" : `${input.weightPercent.toFixed(1)} %`}

Actualités récentes :
${news}`
}

const RECOMMENDATION_ACTIONS: readonly RecommendationAction[] = [
  "sell_now",
  "hold",
  "reinforce",
]
const CONVICTION_LEVELS: readonly ConvictionLevel[] = ["low", "medium", "high"]

function toPrice(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

/** Parses and validates the sell tiers, capped at 3 and ordered by price. */
function parseSellTargets(value: unknown): SellTarget[] {
  if (!Array.isArray(value)) return []

  const targets: SellTarget[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const price = (item as { price?: unknown }).price
    const percent = (item as { percent?: unknown }).percent
    if (
      typeof price === "number" &&
      Number.isFinite(price) &&
      price > 0 &&
      typeof percent === "number" &&
      Number.isFinite(percent) &&
      percent > 0
    ) {
      targets.push({ price, percent })
    }
  }

  const ordered = targets.sort((a, b) => a.price - b.price).slice(0, 3)

  // Rescale the tiers so their shares sum to 100% when the model drifts.
  const total = ordered.reduce((sum, target) => sum + target.percent, 0)
  if (total > 0 && Math.abs(total - 100) > 0.5) {
    for (const target of ordered) {
      target.percent = (target.percent / total) * 100
    }
  }

  return ordered
}

/**
 * Generates a structured sell recommendation for a single position. Claude is
 * forced to answer through the `submit_recommendation` tool so the output is
 * always a typed object rather than free text.
 */
export async function generatePositionRecommendation(
  input: PositionRecommendationInput
): Promise<PositionRecommendationResult> {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: RECOMMENDATION_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [RECOMMENDATION_TOOL],
    tool_choice: { type: "tool", name: RECOMMENDATION_TOOL.name },
    messages: [{ role: "user", content: buildRecommendationPrompt(input) }],
  })

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === RECOMMENDATION_TOOL.name
  )
  if (!toolUse) {
    throw new Error("Claude did not return a recommendation")
  }

  const raw = toolUse.input as Record<string, unknown>
  const action = raw.action as RecommendationAction
  const conviction = raw.conviction as ConvictionLevel
  if (
    !RECOMMENDATION_ACTIONS.includes(action) ||
    !CONVICTION_LEVELS.includes(conviction)
  ) {
    throw new Error("Claude returned an invalid recommendation")
  }

  return {
    action,
    sellTargets: parseSellTargets(raw.sell_targets),
    stopLossPrice: toPrice(raw.stop_loss_price),
    conviction,
  }
}

/** Stable system instructions for the daily portfolio summary. */
const DAILY_SUMMARY_SYSTEM_PROMPT = `Tu es un assistant d'aide à la décision
pour une application de suivi de portefeuille d'actions. À partir d'un
instantané du portefeuille de l'utilisateur, tu produis un résumé quotidien
actionnable dont l'objectif est de l'aider à savoir QUOI VENDRE et QUAND.

Structure ta réponse en français avec exactement ces sections, chacune
introduite par son titre seul sur sa ligne :

Météo du portefeuille
Une phrase sur la performance du jour et la tendance générale.

À vendre / alléger en priorité
1 à 3 positions classées par priorité. Pour chacune : le titre, la raison
(objectif de plus-value atteint, tendance qui se retourne, ligne surpondérée,
perte qui s'aggrave) et le QUAND (niveau de prix ou condition déclencheuse).
Si rien ne justifie une vente, dis-le clairement.

À renforcer / opportunités
Positions intéressantes à renforcer, ou « Rien à signaler ».

À conserver
Les positions où il ne faut rien faire, pour éviter le sur-trading.

Point de vigilance
Un risque clé (concentration, exposition sectorielle, perte importante).

Sois concret et chiffré, environ 250 mots. Tu n'es pas conseiller financier :
ne donne pas d'ordre d'achat ou de vente définitif et termine par une ligne
rappelant que ce n'est pas un conseil en investissement.`

export interface DailySummaryPosition {
  symbol: string
  name: string | null
  weightPercent: number
  pnlPercent: number | null
  dayChangePercent: number | null
  currentPrice: number | null
  takeProfit: number
  stopLoss: number
  currency: string
}

export interface DailySummaryInput {
  totalValue: number
  totalPnlPercent: number
  positions: DailySummaryPosition[]
}

/** Generates the daily, decision-oriented portfolio summary. */
export async function composeDailySummary(
  input: DailySummaryInput
): Promise<string> {
  const lines = input.positions
    .map((position) => {
      const pnl =
        position.pnlPercent === null
          ? "n/a"
          : `${(position.pnlPercent * 100).toFixed(1)} %`
      const day =
        position.dayChangePercent === null
          ? "n/a"
          : `${position.dayChangePercent.toFixed(2)} %`
      const price =
        position.currentPrice === null
          ? "n/a"
          : position.currentPrice.toFixed(2)
      return `- ${position.symbol}${position.name ? ` (${position.name})` : ""} : poids ${position.weightPercent.toFixed(1)} %, cours ${price} ${position.currency}, P/L ${pnl}, variation du jour ${day}, objectif de prise de bénéfices ${position.takeProfit.toFixed(2)}, stop ${position.stopLoss.toFixed(2)}`
    })
    .join("\n")

  const userPrompt = `Instantané du portefeuille.

Valeur totale : ${input.totalValue.toFixed(2)}
Performance latente globale : ${(input.totalPnlPercent * 100).toFixed(2)} %

Positions :
${lines || "(aucune position)"}`

  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: DAILY_SUMMARY_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  })

  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim()
}
