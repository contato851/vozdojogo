export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_generation_log: {
        Row: {
          created_at: string
          estimated_cost_usd: number | null
          id: string
          input_tokens: number | null
          output_tokens: number | null
          success: boolean
          user_id: string
          web_searches: number | null
        }
        Insert: {
          created_at?: string
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          success?: boolean
          user_id: string
          web_searches?: number | null
        }
        Update: {
          created_at?: string
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          success?: boolean
          user_id?: string
          web_searches?: number | null
        }
        Relationships: []
      }
      billing_customers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          mp_payer_id: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          mp_payer_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          mp_payer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      custom_teams: {
        Row: {
          abbreviation: string
          accent: string
          color: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          players: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          abbreviation?: string
          accent?: string
          color?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          players?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          abbreviation?: string
          accent?: string
          color?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          players?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      live_broadcasts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          match_data: Json
          share_code: string
          state: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          match_data?: Json
          share_code?: string
          state?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          match_data?: Json
          share_code?: string
          state?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      saved_lineups: {
        Row: {
          created_at: string
          id: string
          players: Json
          team_name: string
          team_name_normalized: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          players?: Json
          team_name: string
          team_name_normalized: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          players?: Json
          team_name?: string
          team_name_normalized?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      squad_overrides: {
        Row: {
          action: string
          api_team_id: number
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          player_data: Json | null
          player_id: string | null
          reason: string
          status: string
        }
        Insert: {
          action: string
          api_team_id: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          player_data?: Json | null
          player_id?: string | null
          reason?: string
          status?: string
        }
        Update: {
          action?: string
          api_team_id?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          player_data?: Json | null
          player_id?: string | null
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_overrides_api_team_id_fkey"
            columns: ["api_team_id"]
            isOneToOne: false
            referencedRelation: "team_squads"
            referencedColumns: ["api_team_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          access_granted: boolean
          billing_customer_id: string
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          grace_deadline: string | null
          id: string
          mp_preapproval_id: string
          status: string
          updated_at: string
        }
        Insert: {
          access_granted?: boolean
          billing_customer_id: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          grace_deadline?: string | null
          id?: string
          mp_preapproval_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          access_granted?: boolean
          billing_customer_id?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          grace_deadline?: string | null
          id?: string
          mp_preapproval_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_billing_customer_id_fkey"
            columns: ["billing_customer_id"]
            isOneToOne: false
            referencedRelation: "billing_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      team_api_mappings: {
        Row: {
          api_football_team_id: number | null
          api_football_team_name: string | null
          app_team_name: string
          confidence: string
          id: string
          needs_narrator_confirmation: boolean
          updated_at: string
        }
        Insert: {
          api_football_team_id?: number | null
          api_football_team_name?: string | null
          app_team_name: string
          confidence?: string
          id?: string
          needs_narrator_confirmation?: boolean
          updated_at?: string
        }
        Update: {
          api_football_team_id?: number | null
          api_football_team_name?: string | null
          app_team_name?: string
          confidence?: string
          id?: string
          needs_narrator_confirmation?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      team_squads: {
        Row: {
          api_team_id: number
          coach: string
          created_at: string
          fetched_at: string
          id: string
          players: Json
          source: string
          team_name: string
          team_name_normalized: string
          updated_at: string
        }
        Insert: {
          api_team_id: number
          coach?: string
          created_at?: string
          fetched_at?: string
          id?: string
          players?: Json
          source?: string
          team_name: string
          team_name_normalized: string
          updated_at?: string
        }
        Update: {
          api_team_id?: number
          coach?: string
          created_at?: string
          fetched_at?: string
          id?: string
          players?: Json
          source?: string
          team_name?: string
          team_name_normalized?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          frequency: string | null
          full_name: string
          id: string
          level: string | null
          main_difficulty: string | null
          narration_type: string[] | null
          onboarding_completed: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          frequency?: string | null
          full_name?: string
          id?: string
          level?: string | null
          main_difficulty?: string | null
          narration_type?: string[] | null
          onboarding_completed?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          frequency?: string | null
          full_name?: string
          id?: string
          level?: string | null
          main_difficulty?: string | null
          narration_type?: string[] | null
          onboarding_completed?: boolean | null
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
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][CompositeTypeName]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
