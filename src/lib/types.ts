import type { Database } from "@/lib/database.types"

type Tables = Database["public"]["Tables"]
type Enums = Database["public"]["Enums"]

export type Position = Tables["positions"]["Row"]
export type PositionInsert = Tables["positions"]["Insert"]
export type PositionUpdate = Tables["positions"]["Update"]
export type PositionObjective = Enums["position_objective"]
export type PositionHorizon = Enums["position_horizon"]
export type RiskTolerance = Enums["risk_tolerance"]

export type PositionRecommendation = Tables["position_recommendations"]["Row"]
export type PositionRecommendationInsert =
  Tables["position_recommendations"]["Insert"]
export type RecommendationAction = Enums["recommendation_action"]
export type ConvictionLevel = Enums["conviction_level"]

/** One tier of a scaled-out exit: sell `percent` of the position at `price`. */
export interface SellTarget {
  price: number
  /** Share of the position to sell at this level, in percent (1–100). */
  percent: number
}

export type Alert = Tables["alerts"]["Row"]
export type AlertInsert = Tables["alerts"]["Insert"]
export type AlertType = Enums["alert_type"]

export type AiMonitoringConfig = Tables["ai_monitoring_config"]["Row"]
export type AiMonitoringConfigInsert = Tables["ai_monitoring_config"]["Insert"]
export type AiReport = Tables["ai_reports"]["Row"]
export type AiFrequency = Enums["ai_frequency"]
export type AiDelivery = Enums["ai_delivery"]

export type NotificationSettings = Tables["notification_settings"]["Row"]
