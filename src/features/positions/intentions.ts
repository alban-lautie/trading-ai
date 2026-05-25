import type {
  PositionHorizon,
  PositionObjective,
  RiskTolerance,
  TradingStyle,
} from "@/lib/types"

/**
 * Per-position investment intent. These labels are the single source of truth
 * for the position form selects and for the AI recommendation prompt, so the
 * model reads the same wording the user picked.
 */

interface IntentionOption<T extends string> {
  value: T
  label: string
}

export const POSITION_OBJECTIVE_OPTIONS: ReadonlyArray<
  IntentionOption<PositionObjective>
> = [
  { value: "quick_gain", label: "Gain rapide" },
  { value: "long_term", label: "Long terme" },
  { value: "income", label: "Revenu (dividendes)" },
]

export const POSITION_HORIZON_OPTIONS: ReadonlyArray<
  IntentionOption<PositionHorizon>
> = [
  { value: "short", label: "Court terme" },
  { value: "medium", label: "Moyen terme" },
  { value: "long", label: "Long terme" },
]

export const RISK_TOLERANCE_OPTIONS: ReadonlyArray<
  IntentionOption<RiskTolerance>
> = [
  { value: "low", label: "Faible" },
  { value: "medium", label: "Modérée" },
  { value: "high", label: "Élevée" },
]

export const TRADING_STYLE_OPTIONS: ReadonlyArray<
  IntentionOption<TradingStyle>
> = [
  { value: "day_trading", label: "Day trading (5–10 %/jour)" },
  { value: "swing", label: "Swing / position" },
]

function toLabelMap<T extends string>(
  options: ReadonlyArray<IntentionOption<T>>
): Record<T, string> {
  return Object.fromEntries(
    options.map((option) => [option.value, option.label])
  ) as Record<T, string>
}

export const POSITION_OBJECTIVE_LABELS = toLabelMap(POSITION_OBJECTIVE_OPTIONS)
export const POSITION_HORIZON_LABELS = toLabelMap(POSITION_HORIZON_OPTIONS)
export const RISK_TOLERANCE_LABELS = toLabelMap(RISK_TOLERANCE_OPTIONS)
export const TRADING_STYLE_LABELS = toLabelMap(TRADING_STYLE_OPTIONS)
