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
      activations: {
        Row: {
          activation_date: string | null
          created_at: string
          customer_id: string
          id: string
          status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          activation_date?: string | null
          created_at?: string
          customer_id: string
          id?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          activation_date?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          action_type: string
          actor_id: string
          contact_method: string | null
          created_at: string
          customer_id: string
          customer_status_after:
            | Database["public"]["Enums"]["customer_status"]
            | null
          escalation_reason: string | null
          escalation_type: string | null
          id: string
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          outcome: string | null
        }
        Insert: {
          action_type: string
          actor_id: string
          contact_method?: string | null
          created_at?: string
          customer_id: string
          customer_status_after?:
            | Database["public"]["Enums"]["customer_status"]
            | null
          escalation_reason?: string | null
          escalation_type?: string | null
          id?: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          outcome?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          contact_method?: string | null
          created_at?: string
          customer_id?: string
          customer_status_after?:
            | Database["public"]["Enums"]["customer_status"]
            | null
          escalation_reason?: string | null
          escalation_type?: string | null
          id?: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      agility_import_batches: {
        Row: {
          committed_at: string | null
          created_at: string
          error_count: number
          file_hash: string
          file_name: string
          id: string
          new_count: number
          row_count: number
          status: string
          updated_count: number
          uploaded_by: string
        }
        Insert: {
          committed_at?: string | null
          created_at?: string
          error_count?: number
          file_hash: string
          file_name: string
          id?: string
          new_count?: number
          row_count?: number
          status?: string
          updated_count?: number
          uploaded_by: string
        }
        Update: {
          committed_at?: string | null
          created_at?: string
          error_count?: number
          file_hash?: string
          file_name?: string
          id?: string
          new_count?: number
          row_count?: number
          status?: string
          updated_count?: number
          uploaded_by?: string
        }
        Relationships: []
      }
      agility_import_rows: {
        Row: {
          batch_id: string
          customer_id: string | null
          id: string
          ovk_number: string | null
          ovr_number: string | null
          raw_data: Json
          row_number: number
          validation_errors: Json
          validation_status: string
        }
        Insert: {
          batch_id: string
          customer_id?: string | null
          id?: string
          ovk_number?: string | null
          ovr_number?: string | null
          raw_data: Json
          row_number: number
          validation_errors?: Json
          validation_status?: string
        }
        Update: {
          batch_id?: string
          customer_id?: string | null
          id?: string
          ovk_number?: string | null
          ovr_number?: string | null
          raw_data?: Json
          row_number?: number
          validation_errors?: Json
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agility_import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "agility_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agility_import_rows_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          alternate_cell_number: string | null
          area_suburb: string | null
          cell_number: string
          created_at: string
          created_by: string
          email: string | null
          external_customer_id: string | null
          first_name: string
          full_address: string | null
          full_name: string | null
          id: string
          last_contact_date: string | null
          next_action: string | null
          next_action_date: string | null
          normalized_cell: string
          original_agent_id: string
          owner_id: string
          payment_type: string | null
          product_package: string | null
          record_status: string
          status: Database["public"]["Enums"]["customer_status"]
          surname: string
          team_leader_id: string | null
          updated_at: string
        }
        Insert: {
          alternate_cell_number?: string | null
          area_suburb?: string | null
          cell_number: string
          created_at?: string
          created_by: string
          email?: string | null
          external_customer_id?: string | null
          first_name: string
          full_address?: string | null
          full_name?: string | null
          id?: string
          last_contact_date?: string | null
          next_action?: string | null
          next_action_date?: string | null
          normalized_cell: string
          original_agent_id: string
          owner_id: string
          payment_type?: string | null
          product_package?: string | null
          record_status?: string
          status?: Database["public"]["Enums"]["customer_status"]
          surname: string
          team_leader_id?: string | null
          updated_at?: string
        }
        Update: {
          alternate_cell_number?: string | null
          area_suburb?: string | null
          cell_number?: string
          created_at?: string
          created_by?: string
          email?: string | null
          external_customer_id?: string | null
          first_name?: string
          full_address?: string | null
          full_name?: string | null
          id?: string
          last_contact_date?: string | null
          next_action?: string | null
          next_action_date?: string | null
          normalized_cell?: string
          original_agent_id?: string
          owner_id?: string
          payment_type?: string | null
          product_package?: string | null
          record_status?: string
          status?: Database["public"]["Enums"]["customer_status"]
          surname?: string
          team_leader_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_agent_activity: {
        Row: {
          activity_date: string
          agent_id: string
          id: string
          last_active_at: string
          touch_count: number
        }
        Insert: {
          activity_date?: string
          agent_id: string
          id?: string
          last_active_at?: string
          touch_count?: number
        }
        Update: {
          activity_date?: string
          agent_id?: string
          id?: string
          last_active_at?: string
          touch_count?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          action_date: string | null
          created_at: string
          customer_id: string
          external_order_id: string | null
          id: string
          next_action: string | null
          order_date: string | null
          ovk_number: string | null
          ovr_number: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          action_date?: string | null
          created_at?: string
          customer_id: string
          external_order_id?: string | null
          id?: string
          next_action?: string | null
          order_date?: string | null
          ovk_number?: string | null
          ovr_number?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_date?: string | null
          created_at?: string
          customer_id?: string
          external_order_id?: string | null
          id?: string
          next_action?: string | null
          order_date?: string | null
          ovk_number?: string | null
          ovr_number?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          payment_date: string | null
          promised_payment_date: string | null
          status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          payment_date?: string | null
          promised_payment_date?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          payment_date?: string | null
          promised_payment_date?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_mappings: {
        Row: {
          active: boolean
          created_at: string
          crm_product: string
          id: string
          source_product: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          crm_product: string
          id?: string
          source_product: string
        }
        Update: {
          active?: boolean
          created_at?: string
          crm_product?: string
          id?: string
          source_product?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agent_code: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          agent_code?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          agent_code?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_customer: {
        Args: { _owner_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_leader_for: {
        Args: { _member_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "team_leader" | "agent"
      customer_status:
        | "new_lead"
        | "contacted"
        | "qualified"
        | "order_submitted"
        | "payment_pending"
        | "activation_pending"
        | "activated"
        | "lost"
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
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "team_leader", "agent"],
      customer_status: [
        "new_lead",
        "contacted",
        "qualified",
        "order_submitted",
        "payment_pending",
        "activation_pending",
        "activated",
        "lost",
      ],
    },
  },
} as const
