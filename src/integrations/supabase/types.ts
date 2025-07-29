export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      events: {
        Row: {
          branding_config: Json | null
          created_at: string
          created_by: string
          custom_fields: Json | null
          description: string | null
          dresscode: string | null
          event_date: string | null
          id: string
          location: string | null
          max_participants: number | null
          name: string
          updated_at: string
        }
        Insert: {
          branding_config?: Json | null
          created_at?: string
          created_by: string
          custom_fields?: Json | null
          description?: string | null
          dresscode?: string | null
          event_date?: string | null
          id?: string
          location?: string | null
          max_participants?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          branding_config?: Json | null
          created_at?: string
          created_by?: string
          custom_fields?: Json | null
          description?: string | null
          dresscode?: string | null
          event_date?: string | null
          id?: string
          location?: string | null
          max_participants?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          custom_data: Json | null
          event_id: string
          id: string
          participant_email: string
          participant_name: string
          processed_at: string | null
          processed_by: string | null
          registered_at: string
          status: Database["public"]["Enums"]["registration_status"]
        }
        Insert: {
          custom_data?: Json | null
          event_id: string
          id?: string
          participant_email: string
          participant_name: string
          processed_at?: string | null
          processed_by?: string | null
          registered_at?: string
          status?: Database["public"]["Enums"]["registration_status"]
        }
        Update: {
          custom_data?: Json | null
          event_id?: string
          id?: string
          participant_email?: string
          participant_name?: string
          processed_at?: string | null
          processed_by?: string | null
          registered_at?: string
          status?: Database["public"]["Enums"]["registration_status"]
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          id: string
          issued_at: string
          qr_code: string
          short_code: string | null
          qr_image_url: string | null
          registration_id: string
          status: Database["public"]["Enums"]["ticket_status"]
          used_at: string | null
          used_by: string | null
          checkin_at: string | null
          checkin_by: string | null
          checkin_location: string | null
          checkin_notes: string | null
        }
        Insert: {
          id?: string
          issued_at?: string
          qr_code: string
          short_code?: string | null
          qr_image_url?: string | null
          registration_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
          used_at?: string | null
          used_by?: string | null
          checkin_at?: string | null
          checkin_by?: string | null
          checkin_location?: string | null
          checkin_notes?: string | null
        }
        Update: {
          id?: string
          issued_at?: string
          qr_code?: string
          short_code?: string | null
          qr_image_url?: string | null
          registration_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          used_at?: string | null
          used_by?: string | null
          checkin_at?: string | null
          checkin_by?: string | null
          checkin_location?: string | null
          checkin_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      checkin_reports: {
        Row: {
          event_id: string
          event_name: string
          event_date: string | null
          event_location: string | null
          registration_id: string
          participant_name: string
          participant_email: string
          phone_number: string | null
          registration_status: Database["public"]["Enums"]["registration_status"]
          registered_at: string
          ticket_id: string | null
          qr_code: string | null
          short_code: string | null
          ticket_status: Database["public"]["Enums"]["ticket_status"] | null
          checkin_at: string | null
          checkin_by: string | null
          checkin_location: string | null
          checkin_notes: string | null
          checked_in_by_name: string | null
          attendance_status: string
        }
      }
    }
    Functions: {
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      get_checkin_stats: {
        Args: { event_id_param?: string }
        Returns: {
          event_id: string
          event_name: string
          total_registrations: number
          checked_in: number
          not_checked_in: number
          attendance_rate: number
        }[]
      }
    }
    Enums: {
      registration_status: "pending" | "approved" | "rejected"
      ticket_status: "unused" | "used"
      user_role: "admin" | "user"
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
      registration_status: ["pending", "approved", "rejected"],
      ticket_status: ["unused", "used"],
      user_role: ["admin", "user"],
    },
  },
} as const
