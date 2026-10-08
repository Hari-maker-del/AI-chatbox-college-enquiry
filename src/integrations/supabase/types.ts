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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_queries: {
        Row: {
          created_at: string
          id: string
          message: string
          response: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          response: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          response?: string
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          annual_fee: number | null
          created_at: string
          min_percentage: number | null
          eligible_streams: string[] | null
          eligibility_note: string | null
          description: string | null
          duration: string
          id: string
          level: string
          name: string
          updated_at: string
        }
        Insert: {
          annual_fee?: number | null
          created_at?: string
          min_percentage?: number | null
          eligible_streams?: string[] | null
          eligibility_note?: string | null
          description?: string | null
          duration: string
          id?: string
          level?: string
          name: string
          updated_at?: string
        }
        Update: {
          annual_fee?: number | null
          created_at?: string
          min_percentage?: number | null
          eligible_streams?: string[] | null
          eligibility_note?: string | null
          description?: string | null
          duration?: string
          id?: string
          level?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      fee_structure: {
        Row: {
          additional_info: string | null
          annual_fee: number
          created_at: string
          duration: string
          id: string
          program: string
          updated_at: string
        }
        Insert: {
          additional_info?: string | null
          annual_fee: number
          created_at?: string
          duration: string
          id?: string
          program: string
          updated_at?: string
        }
        Update: {
          additional_info?: string | null
          annual_fee?: number
          created_at?: string
          duration?: string
          id?: string
          program?: string
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
          updated_at: string
          user_id: string
          phone: string | null
          roll_number: string | null
          department: string | null
          year_level: string | null
          section: string | null
          interests: string[] | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          phone?: string | null
          roll_number?: string | null
          department?: string | null
          year_level?: string | null
          section?: string | null
          interests?: string[] | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          phone?: string | null
          roll_number?: string | null
          department?: string | null
          year_level?: string | null
          section?: string | null
          interests?: string[] | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
      campus_service_requests: {
        Row: { id: string; user_id: string; request_code: string; service_type: string; title: string; purpose: string | null; delivery_method: string | null; details: Json; status: string; submitted_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; request_code?: string; service_type: string; title: string; purpose?: string | null; delivery_method?: string | null; details?: Json; status?: string; submitted_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; request_code?: string; service_type?: string; title?: string; purpose?: string | null; delivery_method?: string | null; details?: Json; status?: string; submitted_at?: string; updated_at?: string }
        Relationships: []
      }
      campus_request_events: {
        Row: { id: string; request_id: string; user_id: string; status: string; note: string | null; created_at: string }
        Insert: { id?: string; request_id: string; user_id: string; status: string; note?: string | null; created_at?: string }
        Update: { id?: string; request_id?: string; user_id?: string; status?: string; note?: string | null; created_at?: string }
        Relationships: []
      }
      campus_appointments: {
        Row: { id: string; user_id: string; appointment_code: string; department: string; staff_name: string | null; appointment_date: string; appointment_time: string; purpose: string | null; status: string; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; appointment_code?: string; department: string; staff_name?: string | null; appointment_date: string; appointment_time: string; purpose?: string | null; status?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; appointment_code?: string; department?: string; staff_name?: string | null; appointment_date?: string; appointment_time?: string; purpose?: string | null; status?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      campus_support_tickets: {
        Row: { id: string; user_id: string; ticket_code: string; category: string; subject: string; description: string; status: string; priority: string; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; ticket_code?: string; category: string; subject: string; description: string; status?: string; priority?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; ticket_code?: string; category?: string; subject?: string; description?: string; status?: string; priority?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      campus_notifications: {
        Row: { id: string; user_id: string; title: string; message: string; type: string; entity_type: string | null; entity_id: string | null; action_label: string | null; action_target: string | null; language: string; read_at: string | null; created_at: string }
        Insert: { id?: string; user_id: string; title: string; message: string; type?: string; entity_type?: string | null; entity_id?: string | null; action_label?: string | null; action_target?: string | null; language?: string; read_at?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; title?: string; message?: string; type?: string; entity_type?: string | null; entity_id?: string | null; action_label?: string | null; action_target?: string | null; language?: string; read_at?: string | null; created_at?: string }
        Relationships: []
      }
      campus_request_messages: {
        Row: { id: string; request_id: string; user_id: string; sender_role: string; message: string; created_at: string; attachment_path: string | null; attachment_name: string | null }
        Insert: { id?: string; request_id: string; user_id: string; sender_role: string; message: string; created_at?: string; attachment_path?: string | null; attachment_name?: string | null }
        Update: { id?: string; request_id?: string; user_id?: string; sender_role?: string; message?: string; created_at?: string; attachment_path?: string | null; attachment_name?: string | null }
        Relationships: []
      }
      campus_fee_invoices: {
        Row: { id: string; user_id: string; title: string; category: string; amount: number; due_date: string | null; status: string; description: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; title: string; category?: string; amount: number; due_date?: string | null; status?: string; description?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; title?: string; category?: string; amount?: number; due_date?: string | null; status?: string; description?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      campus_fee_payments: {
        Row: { id: string; user_id: string; invoice_id: string | null; amount: number; payment_status: string; payment_method: string | null; transaction_ref: string | null; gateway: string | null; gateway_order_id: string | null; gateway_payment_id: string | null; created_at: string; paid_at: string | null }
        Insert: { id?: string; user_id: string; invoice_id?: string | null; amount: number; payment_status?: string; payment_method?: string | null; transaction_ref?: string | null; gateway?: string | null; gateway_order_id?: string | null; gateway_payment_id?: string | null; created_at?: string; paid_at?: string | null }
        Update: { id?: string; user_id?: string; invoice_id?: string | null; amount?: number; payment_status?: string; payment_method?: string | null; transaction_ref?: string | null; gateway?: string | null; gateway_order_id?: string | null; gateway_payment_id?: string | null; created_at?: string; paid_at?: string | null }
        Relationships: []
      }
      campus_service_catalog: {
        Row: { id: string; name: string; service_type: string; description: string | null; department: string | null; keywords: string[]; requirements: string[]; active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; service_type: string; description?: string | null; department?: string | null; keywords?: string[]; requirements?: string[]; active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; service_type?: string; description?: string | null; department?: string | null; keywords?: string[]; requirements?: string[]; active?: boolean; created_at?: string; updated_at?: string }
        Relationships: []
      }
    Views: {

      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
