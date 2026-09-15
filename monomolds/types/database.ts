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
      checkout_quotes: {
        Row: {
          consumed_at: string | null
          created_at: string
          delivery_method: string
          expires_at: string
          id: string
          input_gifts: Json
          input_items: Json
          quote: Json
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          delivery_method: string
          expires_at: string
          id?: string
          input_gifts?: Json
          input_items: Json
          quote: Json
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          delivery_method?: string
          expires_at?: string
          id?: string
          input_gifts?: Json
          input_items?: Json
          quote?: Json
        }
        Relationships: []
      }
      checkout_rate_limits: {
        Row: {
          created_at: string
          id: number
          operation: string
          request_fingerprint: string
        }
        Insert: {
          created_at?: string
          id?: never
          operation: string
          request_fingerprint: string
        }
        Update: {
          created_at?: string
          id?: never
          operation?: string
          request_fingerprint?: string
        }
        Relationships: []
      }
      commerce_settings: {
        Row: {
          courier_price: number
          courier_rule_version: string
          free_shipping_min_items: number
          large_order_notice: string
          large_order_notice_version: string
          large_order_threshold_items: number
          locker_price: number
          locker_rule_version: string
          pricing_policy_version: string
          quote_validity_minutes: number
          singleton: boolean
          terms_version: string
        }
        Insert: {
          courier_price: number
          courier_rule_version: string
          free_shipping_min_items: number
          large_order_notice: string
          large_order_notice_version: string
          large_order_threshold_items: number
          locker_price: number
          locker_rule_version: string
          pricing_policy_version: string
          quote_validity_minutes: number
          singleton?: boolean
          terms_version: string
        }
        Update: {
          courier_price?: number
          courier_rule_version?: string
          free_shipping_min_items?: number
          large_order_notice?: string
          large_order_notice_version?: string
          large_order_threshold_items?: number
          locker_price?: number
          locker_rule_version?: string
          pricing_policy_version?: string
          quote_validity_minutes?: number
          singleton?: boolean
          terms_version?: string
        }
        Relationships: []
      }
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
      order_deliveries: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country_code: string | null
          method: string
          order_id: string
          parcel_size: string
          point_id: string | null
          postal_code: string | null
          price: number
          rule_version: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country_code?: string | null
          method: string
          order_id: string
          parcel_size: string
          point_id?: string | null
          postal_code?: string | null
          price: number
          rule_version: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country_code?: string | null
          method?: string
          order_id?: string
          parcel_size?: string
          point_id?: string | null
          postal_code?: string | null
          price?: number
          rule_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          components: Json
          discount_total: number
          id: string
          is_gift: boolean
          line_total: number
          merchandise_id: string
          name: string
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          components?: Json
          discount_total?: number
          id?: string
          is_gift?: boolean
          line_total: number
          merchandise_id: string
          name: string
          order_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          components?: Json
          discount_total?: number
          id?: string
          is_gift?: boolean
          line_total?: number
          merchandise_id?: string
          name?: string
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_lead_time_notice_at: string | null
          accepted_lead_time_notice_version: string | null
          accepted_terms_at: string | null
          accepted_terms_version: string | null
          checkout_payload_hash: string | null
          created_at: string
          currency: string
          delivery_method: string | null
          discount_code: string | null
          discount_total: number
          email: string
          first_name: string | null
          guest_token_hash: string | null
          id: string
          idempotency_key: string | null
          invoice_address_line1: string | null
          invoice_address_line2: string | null
          invoice_city: string | null
          invoice_company_name: string | null
          invoice_country_code: string | null
          invoice_email: string | null
          invoice_nip: string | null
          invoice_postal_code: string | null
          invoice_requested: boolean
          items: Json | null
          last_name: string | null
          order_number: number
          parcel_size: string | null
          phone: string | null
          pricing_policy_version: string | null
          quote_id: string | null
          shipping_address: Json | null
          shipping_rule_version: string | null
          shipping_total: number
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          accepted_lead_time_notice_at?: string | null
          accepted_lead_time_notice_version?: string | null
          accepted_terms_at?: string | null
          accepted_terms_version?: string | null
          checkout_payload_hash?: string | null
          created_at?: string
          currency?: string
          delivery_method?: string | null
          discount_code?: string | null
          discount_total?: number
          email: string
          first_name?: string | null
          guest_token_hash?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_address_line1?: string | null
          invoice_address_line2?: string | null
          invoice_city?: string | null
          invoice_company_name?: string | null
          invoice_country_code?: string | null
          invoice_email?: string | null
          invoice_nip?: string | null
          invoice_postal_code?: string | null
          invoice_requested?: boolean
          items?: Json | null
          last_name?: string | null
          order_number?: number
          parcel_size?: string | null
          phone?: string | null
          pricing_policy_version?: string | null
          quote_id?: string | null
          shipping_address?: Json | null
          shipping_rule_version?: string | null
          shipping_total?: number
          status?: string
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          accepted_lead_time_notice_at?: string | null
          accepted_lead_time_notice_version?: string | null
          accepted_terms_at?: string | null
          accepted_terms_version?: string | null
          checkout_payload_hash?: string | null
          created_at?: string
          currency?: string
          delivery_method?: string | null
          discount_code?: string | null
          discount_total?: number
          email?: string
          first_name?: string | null
          guest_token_hash?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_address_line1?: string | null
          invoice_address_line2?: string | null
          invoice_city?: string | null
          invoice_company_name?: string | null
          invoice_country_code?: string | null
          invoice_email?: string | null
          invoice_nip?: string | null
          invoice_postal_code?: string | null
          invoice_requested?: boolean
          items?: Json | null
          last_name?: string | null
          order_number?: number
          parcel_size?: string | null
          phone?: string | null
          pricing_policy_version?: string | null
          quote_id?: string | null
          shipping_address?: Json | null
          shipping_rule_version?: string | null
          shipping_total?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_checkout_quote_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "checkout_quotes"
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
        ]
      }
      product_details: {
        Row: {
          capacity_ml: number
          care_instructions: string[]
          material: string
          model_alt_text: string | null
          model_storage_path: string | null
          product_id: string
        }
        Insert: {
          capacity_ml: number
          care_instructions: string[]
          material: string
          model_alt_text?: string | null
          model_storage_path?: string | null
          product_id: string
        }
        Update: {
          capacity_ml?: number
          care_instructions?: string[]
          material?: string
          model_alt_text?: string | null
          model_storage_path?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
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
          bundle_quantity: number | null
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
          bundle_quantity?: number | null
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
          bundle_quantity?: number | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_checkout_quote: {
        Args: {
          p_delivery_method: string
          p_gifts: Json
          p_items: Json
          p_request_fingerprint: string
        }
        Returns: Json
      }
      finalize_guest_order: {
        Args: {
          p_accepted_lead_time_notice_version: string
          p_accepted_terms_version: string
          p_customer: Json
          p_delivery: Json
          p_guest_token_hash: string
          p_idempotency_key: string
          p_invoice: Json
          p_payload_hash: string
          p_quote_id: string
          p_request_fingerprint: string
        }
        Returns: Json
      }
      get_guest_order_status: {
        Args: {
          p_guest_token_hash: string
          p_phone: string
          p_request_fingerprint: string
        }
        Returns: Json
      }
      resend_guest_order_status_link: {
        Args: {
          p_email: string
          p_order_number: number
          p_phone: string
          p_request_fingerprint: string
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
