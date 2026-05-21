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

export type Watchlist = Tables["watchlist"]["Row"]
export type WatchlistInsert = Tables["watchlist"]["Insert"]
export type WatchlistUpdate = Tables["watchlist"]["Update"]
export type EntryAction = Enums["entry_action"]

export type AiMonitoringConfig = Tables["ai_monitoring_config"]["Row"]
export type AiMonitoringConfigInsert = Tables["ai_monitoring_config"]["Insert"]
export type AiReport = Tables["ai_reports"]["Row"]
export type AiFrequency = Enums["ai_frequency"]
export type AiDelivery = Enums["ai_delivery"]

export type NotificationSettings = Tables["notification_settings"]["Row"]

export type ChatConversation = Tables["chat_conversations"]["Row"]
export type ChatConversationInsert = Tables["chat_conversations"]["Insert"]
export type ChatConversationUpdate = Tables["chat_conversations"]["Update"]
export type ChatMessage = Tables["chat_messages"]["Row"]
export type ChatMessageInsert = Tables["chat_messages"]["Insert"]
export type ChatRole = Enums["chat_role"]

export type PositionSale = Tables["position_sales"]["Row"]
export type PositionSaleInsert = Tables["position_sales"]["Insert"]
