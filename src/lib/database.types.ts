export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_monitoring_config: {
        Row: {
          created_at: string
          delivery: Database["public"]["Enums"]["ai_delivery"]
          focus_areas: string[]
          frequency: Database["public"]["Enums"]["ai_frequency"]
          id: string
          is_enabled: boolean
          last_run_at: string | null
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery?: Database["public"]["Enums"]["ai_delivery"]
          focus_areas?: string[]
          frequency?: Database["public"]["Enums"]["ai_frequency"]
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery?: Database["public"]["Enums"]["ai_delivery"]
          focus_areas?: string[]
          frequency?: Database["public"]["Enums"]["ai_frequency"]
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_reports: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          position_id: string | null
          proposal_kind: string | null
          symbol: string
          threshold: number
          tranche_percent: number | null
          triggered_at: string | null
          type: Database["public"]["Enums"]["alert_type"]
          updated_at: string
          user_id: string
          watchlist_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          position_id?: string | null
          proposal_kind?: string | null
          symbol: string
          threshold: number
          tranche_percent?: number | null
          triggered_at?: string | null
          type: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
          user_id: string
          watchlist_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          position_id?: string | null
          proposal_kind?: string | null
          symbol?: string
          threshold?: number
          tranche_percent?: number | null
          triggered_at?: string | null
          type?: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
          user_id?: string
          watchlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "watchlist"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          position_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["chat_role"]
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["chat_role"]
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["chat_role"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_summaries: {
        Row: {
          content: string
          created_at: string
          id: string
          summary_date: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          summary_date?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          summary_date?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          telegram_chat_id: string | null
          telegram_link_code: string | null
          telegram_linked_at: string | null
          telegram_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          telegram_chat_id?: string | null
          telegram_link_code?: string | null
          telegram_linked_at?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          telegram_chat_id?: string | null
          telegram_link_code?: string | null
          telegram_linked_at?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      position_recommendations: {
        Row: {
          action: Database["public"]["Enums"]["recommendation_action"]
          conviction: Database["public"]["Enums"]["conviction_level"]
          generated_at: string
          id: string
          position_id: string
          sell_targets: Json
          stop_loss_price: number | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["recommendation_action"]
          conviction: Database["public"]["Enums"]["conviction_level"]
          generated_at?: string
          id?: string
          position_id: string
          sell_targets?: Json
          stop_loss_price?: number | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["recommendation_action"]
          conviction?: Database["public"]["Enums"]["conviction_level"]
          generated_at?: string
          id?: string
          position_id?: string
          sell_targets?: Json
          stop_loss_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_recommendations_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: true
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          average_price: number
          created_at: string
          currency: string
          horizon: Database["public"]["Enums"]["position_horizon"]
          id: string
          monitoring_enabled: boolean
          name: string | null
          notes: string | null
          objective: Database["public"]["Enums"]["position_objective"]
          opened_at: string
          quantity: number
          risk_tolerance: Database["public"]["Enums"]["risk_tolerance"]
          symbol: string
          target_gain_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_price: number
          created_at?: string
          currency?: string
          horizon?: Database["public"]["Enums"]["position_horizon"]
          id?: string
          monitoring_enabled?: boolean
          name?: string | null
          notes?: string | null
          objective?: Database["public"]["Enums"]["position_objective"]
          opened_at?: string
          quantity: number
          risk_tolerance?: Database["public"]["Enums"]["risk_tolerance"]
          symbol: string
          target_gain_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_price?: number
          created_at?: string
          currency?: string
          horizon?: Database["public"]["Enums"]["position_horizon"]
          id?: string
          monitoring_enabled?: boolean
          name?: string | null
          notes?: string | null
          objective?: Database["public"]["Enums"]["position_objective"]
          opened_at?: string
          quantity?: number
          risk_tolerance?: Database["public"]["Enums"]["risk_tolerance"]
          symbol?: string
          target_gain_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          change: number
          change_percent: number
          currency: string
          name: string | null
          price: number
          symbol: string
          updated_at: string
        }
        Insert: {
          change?: number
          change_percent?: number
          currency?: string
          name?: string | null
          price: number
          symbol: string
          updated_at?: string
        }
        Update: {
          change?: number
          change_percent?: number
          currency?: string
          name?: string | null
          price?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          conviction: Database["public"]["Enums"]["conviction_level"] | null
          created_at: string
          currency: string
          entry_action: Database["public"]["Enums"]["entry_action"] | null
          id: string
          name: string | null
          notes: string | null
          rationale: string | null
          recommendation_generated_at: string | null
          recommended_entry_price: number | null
          symbol: string
          target_gain_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conviction?: Database["public"]["Enums"]["conviction_level"] | null
          created_at?: string
          currency?: string
          entry_action?: Database["public"]["Enums"]["entry_action"] | null
          id?: string
          name?: string | null
          notes?: string | null
          rationale?: string | null
          recommendation_generated_at?: string | null
          recommended_entry_price?: number | null
          symbol: string
          target_gain_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conviction?: Database["public"]["Enums"]["conviction_level"] | null
          created_at?: string
          currency?: string
          entry_action?: Database["public"]["Enums"]["entry_action"] | null
          id?: string
          name?: string | null
          notes?: string | null
          rationale?: string | null
          recommendation_generated_at?: string | null
          recommended_entry_price?: number | null
          symbol?: string
          target_gain_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ai_delivery: "telegram" | "in_app" | "both"
      ai_frequency: "daily" | "weekly" | "monthly"
      alert_type:
        | "price_above"
        | "price_below"
        | "change_percent_above"
        | "change_percent_below"
        | "unrealized_gain_above"
        | "unrealized_loss_above"
      chat_role: "user" | "assistant"
      conviction_level: "low" | "medium" | "high"
      entry_action: "buy_now" | "wait"
      position_horizon: "short" | "medium" | "long"
      position_objective: "quick_gain" | "long_term" | "income"
      recommendation_action: "sell_now" | "hold" | "reinforce"
      risk_tolerance: "low" | "medium" | "high"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_delivery: ["telegram", "in_app", "both"],
      ai_frequency: ["daily", "weekly", "monthly"],
      alert_type: [
        "price_above",
        "price_below",
        "change_percent_above",
        "change_percent_below",
        "unrealized_gain_above",
        "unrealized_loss_above",
      ],
      chat_role: ["user", "assistant"],
      conviction_level: ["low", "medium", "high"],
      entry_action: ["buy_now", "wait"],
      position_horizon: ["short", "medium", "long"],
      position_objective: ["quick_gain", "long_term", "income"],
      recommendation_action: ["sell_now", "hold", "reinforce"],
      risk_tolerance: ["low", "medium", "high"],
    },
  },
} as const

