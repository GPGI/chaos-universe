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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      automation_settings: {
        Row: {
          automation_type: Database["public"]["Enums"]["automation_type"]
          config: Json | null
          created_at: string | null
          enabled: boolean | null
          id: string
          last_executed: string | null
          owner_wallet: string
          portfolio_id: string | null
        }
        Insert: {
          automation_type: Database["public"]["Enums"]["automation_type"]
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_executed?: string | null
          owner_wallet: string
          portfolio_id?: string | null
        }
        Update: {
          automation_type?: Database["public"]["Enums"]["automation_type"]
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_executed?: string | null
          owner_wallet?: string
          portfolio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_settings_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      black_market_invites: {
        Row: {
          invite_code: string
          invited_at: string | null
          invited_by: string | null
          used: boolean | null
          wallet_address: string
        }
        Insert: {
          invite_code: string
          invited_at?: string | null
          invited_by?: string | null
          used?: boolean | null
          wallet_address: string
        }
        Update: {
          invite_code?: string
          invited_at?: string | null
          invited_by?: string | null
          used?: boolean | null
          wallet_address?: string
        }
        Relationships: []
      }
      digital_identities: {
        Row: {
          avatar_cid: string | null
          created_at: string | null
          id: string
          identity_type: string | null
          metadata_cid: string | null
          name: string
          wallet_address: string
        }
        Insert: {
          avatar_cid?: string | null
          created_at?: string | null
          id?: string
          identity_type?: string | null
          metadata_cid?: string | null
          name: string
          wallet_address: string
        }
        Update: {
          avatar_cid?: string | null
          created_at?: string | null
          id?: string
          identity_type?: string | null
          metadata_cid?: string | null
          name?: string
          wallet_address?: string
        }
        Relationships: []
      }
      economy_ticks: {
        Row: {
          chaos_tokens_generated: number | null
          id: string
          plot_id: number | null
          processed_at: string | null
          resources_generated: Json | null
          tick_number: number
        }
        Insert: {
          chaos_tokens_generated?: number | null
          id?: string
          plot_id?: number | null
          processed_at?: string | null
          resources_generated?: Json | null
          tick_number: number
        }
        Update: {
          chaos_tokens_generated?: number | null
          id?: string
          plot_id?: number | null
          processed_at?: string | null
          resources_generated?: Json | null
          tick_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "economy_ticks_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plots"
            referencedColumns: ["id"]
          },
        ]
      }
      factions: {
        Row: {
          created_at: string | null
          founder_wallet: string
          governance_model: string | null
          id: string
          member_wallets: string[] | null
          name: string
          plot_ids: number[] | null
          treasury_balance: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          founder_wallet: string
          governance_model?: string | null
          id?: string
          member_wallets?: string[] | null
          name: string
          plot_ids?: number[] | null
          treasury_balance?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          founder_wallet?: string
          governance_model?: string | null
          id?: string
          member_wallets?: string[] | null
          name?: string
          plot_ids?: number[] | null
          treasury_balance?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          asset_id: string
          asset_type: string
          buyer_wallet: string | null
          description: string | null
          id: string
          listed_at: string | null
          metadata: Json | null
          price: number
          seller_wallet: string
          sold_at: string | null
          status: string | null
          token_type: string | null
        }
        Insert: {
          asset_id: string
          asset_type: string
          buyer_wallet?: string | null
          description?: string | null
          id?: string
          listed_at?: string | null
          metadata?: Json | null
          price: number
          seller_wallet: string
          sold_at?: string | null
          status?: string | null
          token_type?: string | null
        }
        Update: {
          asset_id?: string
          asset_type?: string
          buyer_wallet?: string | null
          description?: string | null
          id?: string
          listed_at?: string | null
          metadata?: Json | null
          price?: number
          seller_wallet?: string
          sold_at?: string | null
          status?: string | null
          token_type?: string | null
        }
        Relationships: []
      }
      npcs: {
        Row: {
          assigned_plot_id: number | null
          created_at: string | null
          employer_wallet: string | null
          employment_history: Json | null
          id: string
          loyalty_score: number | null
          nft_id: number | null
          personality_vector: Json | null
          skills: Json | null
          updated_at: string | null
        }
        Insert: {
          assigned_plot_id?: number | null
          created_at?: string | null
          employer_wallet?: string | null
          employment_history?: Json | null
          id?: string
          loyalty_score?: number | null
          nft_id?: number | null
          personality_vector?: Json | null
          skills?: Json | null
          updated_at?: string | null
        }
        Update: {
          assigned_plot_id?: number | null
          created_at?: string | null
          employer_wallet?: string | null
          employment_history?: Json | null
          id?: string
          loyalty_score?: number | null
          nft_id?: number | null
          personality_vector?: Json | null
          skills?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npcs_assigned_plot_id_fkey"
            columns: ["assigned_plot_id"]
            isOneToOne: false
            referencedRelation: "plots"
            referencedColumns: ["id"]
          },
        ]
      }
      planets: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          name: string
          node_type: string | null
          owner_wallet: string
          planet_type: string | null
          star_system_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          name: string
          node_type?: string | null
          owner_wallet: string
          planet_type?: string | null
          star_system_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          name?: string
          node_type?: string | null
          owner_wallet?: string
          planet_type?: string | null
          star_system_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planets_star_system_id_fkey"
            columns: ["star_system_id"]
            isOneToOne: false
            referencedRelation: "star_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      plots: {
        Row: {
          building_stage: number | null
          coord_x: number
          coord_y: number
          created_at: string | null
          id: number
          last_tick: string | null
          metadata_cid: string | null
          owner_wallet: string | null
          production_rate: number | null
          updated_at: string | null
          workers: Json | null
          zone_type: string | null
        }
        Insert: {
          building_stage?: number | null
          coord_x: number
          coord_y: number
          created_at?: string | null
          id: number
          last_tick?: string | null
          metadata_cid?: string | null
          owner_wallet?: string | null
          production_rate?: number | null
          updated_at?: string | null
          workers?: Json | null
          zone_type?: string | null
        }
        Update: {
          building_stage?: number | null
          coord_x?: number
          coord_y?: number
          created_at?: string | null
          id?: number
          last_tick?: string | null
          metadata_cid?: string | null
          owner_wallet?: string | null
          production_rate?: number | null
          updated_at?: string | null
          workers?: Json | null
          zone_type?: string | null
        }
        Relationships: []
      }
      portfolio_followers: {
        Row: {
          active: boolean | null
          allocation_amount: number | null
          copy_percent: number | null
          follower_wallet: string
          id: string
          manager_wallet: string
          started_at: string | null
        }
        Insert: {
          active?: boolean | null
          allocation_amount?: number | null
          copy_percent?: number | null
          follower_wallet: string
          id?: string
          manager_wallet: string
          started_at?: string | null
        }
        Update: {
          active?: boolean | null
          allocation_amount?: number | null
          copy_percent?: number | null
          follower_wallet?: string
          id?: string
          manager_wallet?: string
          started_at?: string | null
        }
        Relationships: []
      }
      portfolio_managers: {
        Row: {
          applied_at: string | null
          approval_status: Database["public"]["Enums"]["manager_status"] | null
          approved_at: string | null
          bio: string | null
          display_name: string
          id: string
          management_fee_percent: number | null
          performance_start_date: string | null
          roi_annualized: number | null
          sharpe_ratio: number | null
          total_followers: number | null
          track_record: Json | null
          verified: boolean | null
          wallet_address: string
        }
        Insert: {
          applied_at?: string | null
          approval_status?: Database["public"]["Enums"]["manager_status"] | null
          approved_at?: string | null
          bio?: string | null
          display_name: string
          id?: string
          management_fee_percent?: number | null
          performance_start_date?: string | null
          roi_annualized?: number | null
          sharpe_ratio?: number | null
          total_followers?: number | null
          track_record?: Json | null
          verified?: boolean | null
          wallet_address: string
        }
        Update: {
          applied_at?: string | null
          approval_status?: Database["public"]["Enums"]["manager_status"] | null
          approved_at?: string | null
          bio?: string | null
          display_name?: string
          id?: string
          management_fee_percent?: number | null
          performance_start_date?: string | null
          roi_annualized?: number | null
          sharpe_ratio?: number | null
          total_followers?: number | null
          track_record?: Json | null
          verified?: boolean | null
          wallet_address?: string
        }
        Relationships: []
      }
      portfolios: {
        Row: {
          auto_reinvest_enabled: boolean | null
          auto_reinvest_percent: number | null
          created_at: string | null
          current_value: number | null
          description: string | null
          id: string
          initial_investment: number | null
          name: string
          owner_wallet: string
          performance_history: Json | null
          risk_level: string | null
          roi_percent: number | null
          status: Database["public"]["Enums"]["portfolio_status"] | null
          updated_at: string | null
        }
        Insert: {
          auto_reinvest_enabled?: boolean | null
          auto_reinvest_percent?: number | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          initial_investment?: number | null
          name: string
          owner_wallet: string
          performance_history?: Json | null
          risk_level?: string | null
          roi_percent?: number | null
          status?: Database["public"]["Enums"]["portfolio_status"] | null
          updated_at?: string | null
        }
        Update: {
          auto_reinvest_enabled?: boolean | null
          auto_reinvest_percent?: number | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          initial_investment?: number | null
          name?: string
          owner_wallet?: string
          performance_history?: Json | null
          risk_level?: string | null
          roi_percent?: number | null
          status?: Database["public"]["Enums"]["portfolio_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recurring_payments: {
        Row: {
          amount: number
          created_at: string | null
          enabled: boolean | null
          frequency: string
          from_wallet: string
          id: string
          last_payment_date: string | null
          next_payment_date: string
          payment_count: number | null
          to_wallet: string | null
          token_type: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          enabled?: boolean | null
          frequency: string
          from_wallet: string
          id?: string
          last_payment_date?: string | null
          next_payment_date: string
          payment_count?: number | null
          to_wallet?: string | null
          token_type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          enabled?: boolean | null
          frequency?: string
          from_wallet?: string
          id?: string
          last_payment_date?: string | null
          next_payment_date?: string
          payment_count?: number | null
          to_wallet?: string | null
          token_type?: string | null
        }
        Relationships: []
      }
      star_systems: {
        Row: {
          chain_id: number | null
          created_at: string | null
          id: string
          name: string
          owner_wallet: string
          planets: string[] | null
          rpc_url: string | null
          status: string | null
          subnet_id: string | null
          treasury_balance: Json | null
          tribute_percent: number | null
          updated_at: string | null
        }
        Insert: {
          chain_id?: number | null
          created_at?: string | null
          id?: string
          name: string
          owner_wallet: string
          planets?: string[] | null
          rpc_url?: string | null
          status?: string | null
          subnet_id?: string | null
          treasury_balance?: Json | null
          tribute_percent?: number | null
          updated_at?: string | null
        }
        Update: {
          chain_id?: number | null
          created_at?: string | null
          id?: string
          name?: string
          owner_wallet?: string
          planets?: string[] | null
          rpc_url?: string | null
          status?: string | null
          subnet_id?: string | null
          treasury_balance?: Json | null
          tribute_percent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number | null
          block_number: number | null
          created_at: string | null
          from_address: string
          id: string
          metadata: Json | null
          status: string | null
          to_address: string | null
          token_type: string | null
          tx_hash: string
          type: string
        }
        Insert: {
          amount?: number | null
          block_number?: number | null
          created_at?: string | null
          from_address: string
          id?: string
          metadata?: Json | null
          status?: string | null
          to_address?: string | null
          token_type?: string | null
          tx_hash: string
          type: string
        }
        Update: {
          amount?: number | null
          block_number?: number | null
          created_at?: string | null
          from_address?: string
          id?: string
          metadata?: Json | null
          status?: string | null
          to_address?: string | null
          token_type?: string | null
          tx_hash?: string
          type?: string
        }
        Relationships: []
      }
      user_balances: {
        Row: {
          avax_balance: number | null
          chaos_balance: number | null
          last_synced: string | null
          sc_balance: number | null
          wallet_address: string
          xbgl_balance: number | null
        }
        Insert: {
          avax_balance?: number | null
          chaos_balance?: number | null
          last_synced?: string | null
          sc_balance?: number | null
          wallet_address: string
          xbgl_balance?: number | null
        }
        Update: {
          avax_balance?: number | null
          chaos_balance?: number | null
          last_synced?: string | null
          sc_balance?: number | null
          wallet_address?: string
          xbgl_balance?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_wallet_owner: { Args: { wallet_addr: string }; Returns: boolean }
    }
    Enums: {
      automation_type: "auto_reinvest" | "recurring_deposit" | "rebalance"
      manager_status: "pending" | "approved" | "rejected"
      portfolio_status: "active" | "paused" | "closed"
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
  public: {
    Enums: {
      automation_type: ["auto_reinvest", "recurring_deposit", "rebalance"],
      manager_status: ["pending", "approved", "rejected"],
      portfolio_status: ["active", "paused", "closed"],
    },
  },
} as const
