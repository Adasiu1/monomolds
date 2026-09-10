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
      discounts: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          type: string
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          type: string
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          type?: string
          value?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          currency: string
          delivery_method: string | null
          discount_code: string | null
          discount_total: number
          email: string
          guest_token: string
          id: string
          items: Json
          lead_time_notice_version: string | null
          parcel_size: string | null
          pricing_policy_version: string | null
          quote_id: string | null
          shipping_address: Json
          shipping_rule_version: string | null
          shipping_total: number
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          delivery_method?: string | null
          discount_code?: string | null
          discount_total?: number
          email: string
          guest_token?: string
          id?: string
          items?: Json
          lead_time_notice_version?: string | null
          parcel_size?: string | null
          pricing_policy_version?: string | null
          quote_id?: string | null
          shipping_address: Json
          shipping_rule_version?: string | null
          shipping_total?: number
          status?: string
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          delivery_method?: string | null
          discount_code?: string | null
          discount_total?: number
          email?: string
          guest_token?: string
          id?: string
          items?: Json
          lead_time_notice_version?: string | null
          parcel_size?: string | null
          pricing_policy_version?: string | null
          quote_id?: string | null
          shipping_address?: Json
          shipping_rule_version?: string | null
          shipping_total?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          expires_at: string
          id: string
          order_id: string
          provider: string
          provider_session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          order_id: string
          provider?: string
          provider_session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          order_id?: string
          provider?: string
          provider_session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          order_id: string
          payload: Json | null
          payment_attempt_id: string | null
          provider: string
          provider_event_id: string
          status: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          order_id: string
          payload?: Json | null
          payment_attempt_id?: string | null
          provider: string
          provider_event_id: string
          status: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string
          payload?: Json | null
          payment_attempt_id?: string | null
          provider?: string
          provider_event_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          position: number
          product_id: string
          storage_path: string
        }
        Insert: {
          alt_text: string
          created_at?: string
          id?: string
          position?: number
          product_id: string
          storage_path: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          bundle_product_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          price: number | null
          slug: string | null
          status: string
          stock_quantity: number
          type: string
          updated_at: string
        }
        Insert: {
          bundle_product_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          price?: number | null
          slug?: string | null
          status?: string
          stock_quantity?: number
          type: string
          updated_at?: string
        }
        Update: {
          bundle_product_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          price?: number | null
          slug?: string | null
          status?: string
          stock_quantity?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_bundle_product_id_fkey"
            columns: ["bundle_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          adjustments: Json
          created_at: string
          currency: string
          delivery_method: string
          discount_total: number
          id: string
          items: Json
          lead_time_notice: string | null
          lead_time_notice_version: string | null
          parcel_size: string | null
          physical_item_count: number
          pricing_policy_version: string
          requires_lead_time_confirmation: boolean
          shipping_rule_version: string
          shipping_total: number
          subtotal: number
          total: number
        }
        Insert: {
          adjustments?: Json
          created_at?: string
          currency?: string
          delivery_method: string
          discount_total?: number
          id?: string
          items: Json
          lead_time_notice?: string | null
          lead_time_notice_version?: string | null
          parcel_size?: string | null
          physical_item_count: number
          pricing_policy_version: string
          requires_lead_time_confirmation?: boolean
          shipping_rule_version: string
          shipping_total: number
          subtotal: number
          total: number
        }
        Update: {
          adjustments?: Json
          created_at?: string
          currency?: string
          delivery_method?: string
          discount_total?: number
          id?: string
          items?: Json
          lead_time_notice?: string | null
          lead_time_notice_version?: string | null
          parcel_size?: string | null
          physical_item_count?: number
          pricing_policy_version?: string
          requires_lead_time_confirmation?: boolean
          shipping_rule_version?: string
          shipping_total?: number
          subtotal?: number
          total?: number
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          id: string
          items: Json
          order_id: string
          payment_attempt_id: string
          processed_at: string | null
          product_amount: number
          provider_refund_id: string | null
          reason: string
          return_shipping_paid_by: string
          shipping_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          items?: Json
          order_id: string
          payment_attempt_id: string
          processed_at?: string | null
          product_amount: number
          provider_refund_id?: string | null
          reason: string
          return_shipping_paid_by: string
          shipping_amount?: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          items?: Json
          order_id?: string
          payment_attempt_id?: string
          processed_at?: string | null
          product_amount?: number
          provider_refund_id?: string | null
          reason?: string
          return_shipping_paid_by?: string
          shipping_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_attempt_order_fkey"
            columns: ["payment_attempt_id", "order_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id", "order_id"]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
