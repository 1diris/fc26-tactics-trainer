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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      careers: {
        Row: {
          club: string
          created_at: string
          current_season_id: string | null
          id: string
          league: string | null
          name: string
          transfer_budget: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          club: string
          created_at?: string
          current_season_id?: string | null
          id?: string
          league?: string | null
          name: string
          transfer_budget?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          club?: string
          created_at?: string
          current_season_id?: string | null
          id?: string
          league?: string | null
          name?: string
          transfer_budget?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "careers_current_season_fk"
            columns: ["current_season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      fc_players: {
        Row: {
          age: number | null
          club_name: string | null
          contract_until: number | null
          created_at: string
          defending: number | null
          dribbling: number | null
          external_id: number
          face_url: string | null
          height_cm: number | null
          id: string
          league_level: number | null
          league_name: string | null
          long_name: string | null
          nationality_name: string | null
          overall: number | null
          pace: number | null
          passing: number | null
          physic: number | null
          positions: string[]
          potential: number | null
          preferred_foot: string | null
          release_clause_eur: number | null
          shooting: number | null
          short_name: string
          skill_moves: number | null
          value_eur: number | null
          wage_eur: number | null
          weak_foot: number | null
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          club_name?: string | null
          contract_until?: number | null
          created_at?: string
          defending?: number | null
          dribbling?: number | null
          external_id: number
          face_url?: string | null
          height_cm?: number | null
          id?: string
          league_level?: number | null
          league_name?: string | null
          long_name?: string | null
          nationality_name?: string | null
          overall?: number | null
          pace?: number | null
          passing?: number | null
          physic?: number | null
          positions?: string[]
          potential?: number | null
          preferred_foot?: string | null
          release_clause_eur?: number | null
          shooting?: number | null
          short_name: string
          skill_moves?: number | null
          value_eur?: number | null
          wage_eur?: number | null
          weak_foot?: number | null
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          club_name?: string | null
          contract_until?: number | null
          created_at?: string
          defending?: number | null
          dribbling?: number | null
          external_id?: number
          face_url?: string | null
          height_cm?: number | null
          id?: string
          league_level?: number | null
          league_name?: string | null
          long_name?: string | null
          nationality_name?: string | null
          overall?: number | null
          pace?: number | null
          passing?: number | null
          physic?: number | null
          positions?: string[]
          potential?: number | null
          preferred_foot?: string | null
          release_clause_eur?: number | null
          shooting?: number | null
          short_name?: string
          skill_moves?: number | null
          value_eur?: number | null
          wage_eur?: number | null
          weak_foot?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      player_snapshots: {
        Row: {
          age: number | null
          career_id: string
          contract_until: string | null
          created_at: string
          form: number | null
          id: string
          market_value: number | null
          overall: number | null
          player_id: string
          position: string | null
          potential: number | null
          season_id: string
          stats: Json
          updated_at: string
          user_id: string
          wage: number | null
        }
        Insert: {
          age?: number | null
          career_id: string
          contract_until?: string | null
          created_at?: string
          form?: number | null
          id?: string
          market_value?: number | null
          overall?: number | null
          player_id: string
          position?: string | null
          potential?: number | null
          season_id: string
          stats?: Json
          updated_at?: string
          user_id: string
          wage?: number | null
        }
        Update: {
          age?: number | null
          career_id?: string
          contract_until?: string | null
          created_at?: string
          form?: number | null
          id?: string
          market_value?: number | null
          overall?: number | null
          player_id?: string
          position?: string | null
          potential?: number | null
          season_id?: string
          stats?: Json
          updated_at?: string
          user_id?: string
          wage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_snapshots_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_snapshots_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_snapshots_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          career_id: string
          created_at: string
          id: string
          name: string
          nationality: string | null
          preferred_foot: string | null
          primary_position: string | null
          shirt_number: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          career_id: string
          created_at?: string
          id?: string
          name: string
          nationality?: string | null
          preferred_foot?: string | null
          primary_position?: string | null
          shirt_number?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          career_id?: string
          created_at?: string
          id?: string
          name?: string
          nationality?: string | null
          preferred_foot?: string | null
          primary_position?: string | null
          shirt_number?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      screenshot_imports: {
        Row: {
          career_id: string
          created_at: string
          error_message: string | null
          id: string
          player_count: number | null
          raw_result: Json | null
          season_id: string | null
          status: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          career_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          player_count?: number | null
          raw_result?: Json | null
          season_id?: string | null
          status?: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          career_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          player_count?: number | null
          raw_result?: Json | null
          season_id?: string | null
          status?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenshot_imports_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshot_imports_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          career_id: string
          created_at: string
          id: string
          label: string
          notes: string | null
          sort_order: number
          user_id: string
        }
        Insert: {
          career_id: string
          created_at?: string
          id?: string
          label: string
          notes?: string | null
          sort_order?: number
          user_id: string
        }
        Update: {
          career_id?: string
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      tactics: {
        Row: {
          career_id: string
          created_at: string
          formation: string
          id: string
          lineup: Json
          name: string
          notes: string | null
          season_id: string | null
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          career_id: string
          created_at?: string
          formation?: string
          id?: string
          lineup?: Json
          name?: string
          notes?: string | null
          season_id?: string | null
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          career_id?: string
          created_at?: string
          formation?: string
          id?: string
          lineup?: Json
          name?: string
          notes?: string | null
          season_id?: string | null
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tactics_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tactics_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_targets: {
        Row: {
          career_id: string
          created_at: string
          expected_price: number | null
          fc_player_id: string
          id: string
          note: string | null
          priority: number
          updated_at: string
          user_id: string
        }
        Insert: {
          career_id: string
          created_at?: string
          expected_price?: number | null
          fc_player_id: string
          id?: string
          note?: string | null
          priority?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          career_id?: string
          created_at?: string
          expected_price?: number | null
          fc_player_id?: string
          id?: string
          note?: string | null
          priority?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_targets_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_targets_fc_player_id_fkey"
            columns: ["fc_player_id"]
            isOneToOne: false
            referencedRelation: "fc_players"
            referencedColumns: ["id"]
          },
        ]
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
    Enums: {},
  },
} as const
