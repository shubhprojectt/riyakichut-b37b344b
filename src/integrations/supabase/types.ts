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
      access_passwords: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          is_enabled: boolean
          is_unlimited: boolean
          is_used: boolean
          password_display: string
          password_hash: string
          remaining_credits: number
          total_credits: number
          updated_at: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          is_enabled?: boolean
          is_unlimited?: boolean
          is_used?: boolean
          password_display: string
          password_hash: string
          remaining_credits?: number
          total_credits?: number
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          is_enabled?: boolean
          is_unlimited?: boolean
          is_used?: boolean
          password_display?: string
          password_hash?: string
          remaining_credits?: number
          total_credits?: number
          updated_at?: string
          used_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      captured_photos: {
        Row: {
          captured_at: string
          id: string
          image_data: string
          ip_address: string | null
          session_id: string
          user_agent: string | null
        }
        Insert: {
          captured_at?: string
          id?: string
          image_data: string
          ip_address?: string | null
          session_id: string
          user_agent?: string | null
        }
        Update: {
          captured_at?: string
          id?: string
          image_data?: string
          ip_address?: string | null
          session_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      captured_videos: {
        Row: {
          captured_at: string
          duration_seconds: number | null
          id: string
          ip_address: string | null
          session_id: string
          user_agent: string | null
          video_url: string
        }
        Insert: {
          captured_at?: string
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          session_id: string
          user_agent?: string | null
          video_url: string
        }
        Update: {
          captured_at?: string
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          session_id?: string
          user_agent?: string | null
          video_url?: string
        }
        Relationships: []
      }
      credit_usage: {
        Row: {
          created_at: string
          credits_used: number
          id: string
          password_id: string
          search_query: string | null
          search_type: string
        }
        Insert: {
          created_at?: string
          credits_used: number
          id?: string
          password_id: string
          search_query?: string | null
          search_type: string
        }
        Update: {
          created_at?: string
          credits_used?: number
          id?: string
          password_id?: string
          search_query?: string | null
          search_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_usage_password_id_fkey"
            columns: ["password_id"]
            isOneToOne: false
            referencedRelation: "access_passwords"
            referencedColumns: ["id"]
          },
        ]
      }
      hit_apis: {
        Row: {
          body: Json
          body_type: string
          created_at: string
          enabled: boolean
          force_proxy: boolean
          headers: Json
          id: string
          method: string
          name: string
          proxy_enabled: boolean
          query_params: Json
          residential_proxy_enabled: boolean
          rotation_enabled: boolean
          updated_at: string
          url: string
        }
        Insert: {
          body?: Json
          body_type?: string
          created_at?: string
          enabled?: boolean
          force_proxy?: boolean
          headers?: Json
          id?: string
          method?: string
          name: string
          proxy_enabled?: boolean
          query_params?: Json
          residential_proxy_enabled?: boolean
          rotation_enabled?: boolean
          updated_at?: string
          url: string
        }
        Update: {
          body?: Json
          body_type?: string
          created_at?: string
          enabled?: boolean
          force_proxy?: boolean
          headers?: Json
          id?: string
          method?: string
          name?: string
          proxy_enabled?: boolean
          query_params?: Json
          residential_proxy_enabled?: boolean
          rotation_enabled?: boolean
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      scheduled_hits: {
        Row: {
          created_at: string
          id: string
          interval_seconds: number
          is_active: boolean
          last_executed_at: string | null
          max_rounds: number | null
          next_execution_at: string | null
          phone_number: string
          start_time: string
          total_hits: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_seconds?: number
          is_active?: boolean
          last_executed_at?: string | null
          max_rounds?: number | null
          next_execution_at?: string | null
          phone_number: string
          start_time: string
          total_hits?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_seconds?: number
          is_active?: boolean
          last_executed_at?: string | null
          max_rounds?: number | null
          next_execution_at?: string | null
          phone_number?: string
          start_time?: string
          total_hits?: number
          updated_at?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          id: string
          ip_address: string | null
          search_query: string
          search_type: string
          searched_at: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          search_query: string
          search_type: string
          searched_at?: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          search_query?: string
          search_type?: string
          searched_at?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_id: string
          id: string
          is_active: boolean
          last_active_at: string
          password_id: string
          session_token: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          is_active?: boolean
          last_active_at?: string
          password_id: string
          session_token: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          is_active?: boolean
          last_active_at?: string
          password_id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_password_id_fkey"
            columns: ["password_id"]
            isOneToOne: false
            referencedRelation: "access_passwords"
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
