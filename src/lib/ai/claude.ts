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
  EntryAction,
  RecommendationAction,
  SellTarget,
  TradingStyle,
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

/** Stable system instructions for the conversational chat about a position. */
const CHAT_SYSTEM_PROMPT = `Tu es un assistant conversationnel pour une
application de suivi de portefeuille d'actions. L'utilisateur discute avec toi
au sujet d'une position qu'il détient. Pour répondre, tu peux appeler des
outils qui te donnent l'état de la position, la courbe (intraday ou daily),
les indicateurs techniques, les actualités et les fondamentaux.

Règles d'usage des outils :
- Appelle systématiquement get_position_state au premier tour pour connaître
  la position, sauf si la question ne porte clairement pas sur la position
  liée à cette conversation.
- Pour une question sur la séance du jour, appelle get_intraday_chart avec
  interval="1m" et range="1d". Pour une lecture sur la semaine passée,
  interval="1m" et range="7d" (la limite du fournisseur). Pour un horizon
  plus long, prends interval="5m" ou "15m" avec range="1mo".
- Pour une question sur la tendance de fond (semaines à mois), utilise
  get_daily_chart avec range="1mo", "6mo" ou "1y".
- Appelle get_indicators si la question porte sur RSI, moyennes mobiles,
  supports/résistances ou volatilité.
- Appelle get_news si l'utilisateur cherche à expliquer un mouvement, ou
  parle d'actualité, de catalyseur, de communiqué.
- Appelle get_fundamentals pour le PER, le BPA, la capitalisation, les
  objectifs de cours des analystes.
- Tu peux appeler plusieurs outils en parallèle dans le même tour si la
  réponse en a besoin. N'appelle pas un outil si l'historique du chat
  contient déjà l'information.

Réponds en français, de façon directe et concrète, en t'appuyant sur les
données que les outils renvoient. Cite les chiffres clés. Tu n'es pas
conseiller financier : ne donne pas d'ordre d'achat ou de vente définitif et
rappelle, lorsque c'est pertinent, que ce n'est pas un conseil en
investissement.`

const CHAT_MAX_TOKENS = 2048
const CHAT_MAX_TOOL_ITERATIONS = 5

const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_position_state",
    description:
      "Renvoie l'état actuel de la position attachée à la conversation : symbole, quantité, prix d'achat moyen, cours actuel, plus/moins-value latente, devise.",
    input_schema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description:
            "Symbole boursier. Optionnel : par défaut, la position liée à la conversation.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_intraday_chart",
    description:
      "Renvoie les bougies intraday d'un symbole (open/high/low/close/volume par bougie). Utilise un format CSV compact. Respecte les limites du fournisseur : interval=1m → range max 7d ; 5m/15m → max 1mo.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Symbole boursier." },
        interval: {
          type: "string",
          enum: ["1m", "5m", "15m", "30m", "60m"],
          description: "Granularité de la bougie.",
        },
        range: {
          type: "string",
          enum: ["1d", "5d", "7d", "1mo"],
          description: "Fenêtre de temps couverte.",
        },
      },
      required: ["symbol", "interval", "range"],
    },
  },
  {
    name: "get_daily_chart",
    description:
      "Renvoie l'historique journalier d'un symbole en CSV compact. Idéal pour la tendance de fond et le range 52 semaines.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Symbole boursier." },
        range: {
          type: "string",
          enum: ["1mo", "6mo", "1y"],
          description: "Fenêtre de temps couverte.",
        },
      },
      required: ["symbol", "range"],
    },
  },
  {
    name: "get_indicators",
    description:
      "Renvoie les indicateurs techniques d'un symbole : SMA50, SMA200, RSI14, ATR14, support et résistance récents.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Symbole boursier." },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_news",
    description:
      "Renvoie les actualités récentes sur un symbole (titre, source, ancienneté).",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Symbole boursier." },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_fundamentals",
    description:
      "Renvoie les fondamentaux d'un symbole : PER, PER prévisionnel, BPA, capitalisation, dividende, beta, objectifs des analystes.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Symbole boursier." },
      },
      required: ["symbol"],
    },
  },
]

/** Callback the caller exposes so Claude can fetch data on demand. */
export type ChatToolRunner = (
  name: string,
  input: Record<string, unknown>
) => Promise<string>

export interface ChatTurnResult {
  reply: string
  /** Number of tool round-trips consumed by this turn. */
  toolIterations: number
}

/**
 * Drives a conversational turn with Claude, with tool use. The caller provides
 * the conversation history (Anthropic-formatted) plus a `runTool` callback
 * that executes a tool call and returns its result as a string. The loop
 * stops when Claude returns `end_turn` or when `CHAT_MAX_TOOL_ITERATIONS` is
 * reached, whichever comes first.
 */
export async function chatAboutPosition(
  messages: Anthropic.MessageParam[],
  runTool: ChatToolRunner
): Promise<ChatTurnResult> {
  const client = getClient()
  const working: Anthropic.MessageParam[] = [...messages]

  for (let iteration = 0; iteration < CHAT_MAX_TOOL_ITERATIONS; iteration += 1) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: CHAT_MAX_TOKENS,
      system: [
        {
          type: "text",
          text: CHAT_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: CHAT_TOOLS,
      messages: working,
    })

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    )

    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      const reply = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim()
      return { reply, toolIterations: iteration }
    }

    working.push({ role: "assistant", content: response.content })

    const toolResults = await Promise.all(
      toolUses.map(async (toolUse) => {
        try {
          const content = await runTool(
            toolUse.name,
            (toolUse.input ?? {}) as Record<string, unknown>
          )
          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content,
          }
        } catch (cause) {
          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content:
              cause instanceof Error
                ? `Error: ${cause.message}`
                : "Error: tool execution failed",
            is_error: true,
          }
        }
      })
    )

    working.push({ role: "user", content: toolResults })
  }

  return {
    reply:
      "Désolé, je n'ai pas pu finaliser la réponse dans le nombre d'étapes autorisé. Reformule ta question ou demande une analyse plus ciblée.",
    toolIterations: CHAT_MAX_TOOL_ITERATIONS,
  }
}

/** Stable system instructions for the per-position sell recommendation. */
const RECOMMENDATION_SYSTEM_PROMPT = `Tu es un moteur de recommandation pour une
application de suivi de portefeuille d'actions. Pour une position donnée, tu
détermines l'action recommandée et des niveaux de prix concrets, en tenant
compte du STYLE DE TRADING déclaré, de l'intention de l'utilisateur sur cette
position, du cours et de sa dynamique, de la volatilité, des indicateurs
techniques, des fondamentaux, des objectifs de cours des analystes, des
actualités récentes et du poids de la ligne dans le portefeuille.

Le style de trading commande l'écartement des paliers :

[STYLE = day_trading]
Horizon : la séance. L'utilisateur vise 5–10 % sur la journée, davantage en
cas de pump. Les paliers de vente DOIVENT rester proches du prix d'achat :
typiquement un premier palier à +3 à +5 %, un second à +7 à +10 %, et un
troisième seulement si le titre est en pump (variation du jour > 5 % avec
momentum confirmé) — entre +12 et +20 %. Le stop est SERRÉ : 1 à 1,5 ATR sous
le cours, ou ~2 % sous le prix d'achat, pour limiter la perte intraday.
Ignore largement les fondamentaux et objectifs analystes à 12 mois — ils ne
gouvernent pas une sortie intraday. action = "sell_now" dès qu'un premier
palier intraday a été touché et que le momentum se retourne.

[STYLE = swing]
Horizon : plusieurs jours à plusieurs semaines. Aligne la recommandation sur
l'intention : un objectif « Gain rapide » avec un horizon court justifie des
paliers plus proches du cours ; un objectif « Long terme » laisse plus de
marge à la hausse.

Règles communes :
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
  /** Trading style declared by the user — switches the recommendation logic. */
  tradingStyle: TradingStyle
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
- Style de trading : ${input.tradingStyle === "day_trading" ? "day_trading (objectif 5–10 % sur la séance, plus en cas de pump)" : "swing (plusieurs jours à plusieurs semaines)"}
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

/** Stable system instructions for the watchlist entry recommendation. */
const ENTRY_SYSTEM_PROMPT = `Tu es un moteur de recommandation pour une
application de suivi de portefeuille d'actions. Pour une action que
l'utilisateur surveille mais ne détient pas encore, tu détermines un POINT
D'ENTRÉE adapté au STYLE DE TRADING déclaré par l'utilisateur.

Deux styles possibles, calibrent radicalement le point d'entrée :

[STYLE = day_trading]
Horizon : la séance. Objectif visé par l'utilisateur : capter 5–10 % (voire
plus en cas de pump) sur la journée. Le point d'entrée DOIT être proche du
cours actuel — typiquement dans une fourchette de ±3 % autour du cours, et
quasiment jamais au-delà de ±5 %. Deux scénarios à privilégier :
  • Breakout : si le titre montre du momentum (variation du jour positive,
    RSI 50–70, cours qui pousse vers la résistance des 20 jours), place
    entry_target_price LÉGÈREMENT AU-DESSUS de la résistance récente (par
    exemple recentHigh × 1,003 à 1,010), pour entrer sur cassure confirmée.
  • Pullback intraday : si le titre consolide ou se replie modérément après
    une hausse, place entry_target_price 0,5 à 2 % SOUS le cours actuel,
    sur un retour vers une zone d'équilibre — pas un repli profond.
Ne propose JAMAIS un repli sur la SMA 50/200 ou un retour sur le plus bas
20 jours en day trading : ces niveaux sont des entrées swing, beaucoup trop
éloignées pour un objectif intraday. Les fondamentaux et les objectifs
d'analystes ne servent qu'à éviter un titre catastrophique, pas à fixer le
prix. action = "buy_now" si le cours est déjà dans la zone d'entrée
(entry_target_price à ±0,5 % du cours actuel) ; "wait" pour un breakout
imminent ou un léger pullback à attendre.

[STYLE = swing]
Horizon : plusieurs jours à plusieurs semaines. Vise un point d'entrée
réaliste : un repli sur un support récent (recentLow, SMA50, SMA200) ou un
niveau cohérent avec la fourchette des analystes. Un RSI > 70 signale un
titre suracheté (mieux vaut attendre un repli) ; < 30, un titre survendu
(entrée plus opportune). Un cours sous sa SMA 200 traduit une tendance de
fond baissière. action = "buy_now" si le cours actuel est déjà à un bon
niveau d'entrée ; "wait" s'il vaut mieux attendre un repli.

Règles communes :
- entry_target_price est exprimé dans la devise de l'action.
- Si l'utilisateur a fixé un gain cible, garde-le à l'esprit ; en day trading
  un gain cible élevé (> 10 %) n'est plausible qu'en cas de pump avéré.
- conviction reflète ta confiance compte tenu des données disponibles : des
  données manquantes la réduisent. En day trading, l'absence de momentum
  clair doit réduire la conviction.
- rationale : 1 à 2 phrases en français justifiant le point d'entrée et,
  en day trading, précisant explicitement le scénario (breakout ou pullback).
- Si le cours est indisponible, renvoie entry_target_price à null.

Réponds uniquement en appelant l'outil submit_entry_recommendation. Ces
recommandations sont une aide à la décision, pas un conseil en investissement
réglementé.`

const ENTRY_TOOL: Anthropic.Tool = {
  name: "submit_entry_recommendation",
  description:
    "Enregistre la recommandation de point d'entrée pour l'action surveillée.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["buy_now", "wait"],
        description:
          "buy_now : le cours est déjà à un bon point d'entrée. wait : attendre un repli vers entry_target_price.",
      },
      entry_target_price: {
        type: ["number", "null"],
        description:
          "Prix d'achat conseillé, dans la devise de l'action. null si le cours est indisponible.",
      },
      conviction: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Niveau de confiance dans la recommandation.",
      },
      rationale: {
        type: "string",
        description: "1 à 2 phrases en français justifiant le point d'entrée.",
      },
    },
    required: ["action", "entry_target_price", "conviction", "rationale"],
  },
}

export interface EntryRecommendationInput {
  symbol: string
  name: string | null
  currency: string
  /** Trading style declared by the user — switches the entry logic. */
  tradingStyle: TradingStyle
  /** Gain the user aims for once bought, in percent, when set. */
  targetGainPercent: number | null
  currentPrice: number | null
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
}

export interface EntryRecommendationResult {
  action: EntryAction
  entryTargetPrice: number | null
  conviction: ConvictionLevel
  rationale: string
}

function buildEntryPrompt(input: EntryRecommendationInput): string {
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
              item.ageDays <= 0 ? "aujourd'hui" : `il y a ${item.ageDays} j`
            return `- [${age}, ${item.publisher}] ${item.title}`
          })
          .join("\n")
      : "(aucune actualité récente)"

  const styleLabel =
    input.tradingStyle === "day_trading"
      ? "day_trading (objectif 5–10 % sur la séance, plus en cas de pump)"
      : "swing (plusieurs jours à plusieurs semaines)"

  return `Analyse cette action surveillée et soumets une recommandation de point d'entrée.

Style de trading : ${styleLabel}

Action : ${input.symbol}${input.name ? ` (${input.name})` : ""}
Devise : ${input.currency}
Cours actuel : ${num(input.currentPrice)} ${input.currency}
Variation du jour : ${pct(input.dayChangePercent)}
Plus haut 52 semaines : ${num(input.fiftyTwoWeekHigh)}
Plus bas 52 semaines : ${num(input.fiftyTwoWeekLow)}
Volatilité annualisée : ${pct(input.volatilityPercent, 1)}
Gain cible visé : ${input.targetGainPercent === null ? "non fixé" : `${input.targetGainPercent} %`}

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

Actualités récentes :
${news}`
}

const ENTRY_ACTIONS: readonly EntryAction[] = ["buy_now", "wait"]

/**
 * Generates a structured entry-point recommendation for a watched stock.
 * Claude is forced to answer through the `submit_entry_recommendation` tool so
 * the output is always a typed object rather than free text.
 */
export async function generateEntryRecommendation(
  input: EntryRecommendationInput
): Promise<EntryRecommendationResult> {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: ENTRY_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [ENTRY_TOOL],
    tool_choice: { type: "tool", name: ENTRY_TOOL.name },
    messages: [{ role: "user", content: buildEntryPrompt(input) }],
  })

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === ENTRY_TOOL.name
  )
  if (!toolUse) {
    throw new Error("Claude did not return an entry recommendation")
  }

  const raw = toolUse.input as Record<string, unknown>
  const action = raw.action as EntryAction
  const conviction = raw.conviction as ConvictionLevel
  if (
    !ENTRY_ACTIONS.includes(action) ||
    !CONVICTION_LEVELS.includes(conviction)
  ) {
    throw new Error("Claude returned an invalid entry recommendation")
  }

  return {
    action,
    entryTargetPrice: toPrice(raw.entry_target_price),
    conviction,
    rationale: typeof raw.rationale === "string" ? raw.rationale.trim() : "",
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
