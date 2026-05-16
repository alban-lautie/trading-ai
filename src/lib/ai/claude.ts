import "server-only"

import Anthropic from "@anthropic-ai/sdk"

import type { PortfolioSummary, PositionWithMetrics } from "@/lib/portfolio"
import type { AiMonitoringConfig } from "@/lib/types"

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
