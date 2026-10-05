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
      about_sections: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_cards: {
        Row: {
          created_at: string
          cta_color: string | null
          cta_link: string
          cta_text: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_color?: string | null
          cta_link?: string
          cta_text?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_color?: string | null
          cta_link?: string
          cta_text?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      consulting_services: {
        Row: {
          created_at: string
          description: string
          details: Json | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          slug: string
          subtitle: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          details?: Json | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug: string
          subtitle: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          details?: Json | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug?: string
          subtitle?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          device: string | null
          event: string
          id: number
          label: string | null
          path: string | null
          product_id: string | null
          referrer: string | null
          session_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          value: number | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          device?: string | null
          event: string
          id?: number
          label?: string | null
          path?: string | null
          product_id?: string | null
          referrer?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value?: number | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          device?: string | null
          event?: string
          id?: number
          label?: string | null
          path?: string | null
          product_id?: string | null
          referrer?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value?: number | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          changed_fields: string[]
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[]
          created_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[]
          created_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          amount: number | null
          city: string | null
          company: string | null
          created_at: string
          email: string
          follow_up_date: string | null
          full_name: string
          id: string
          is_read: boolean
          items: Json
          landing_page: string | null
          message: string | null
          notes: string
          phone: string | null
          quote_number: string | null
          referrer: string | null
          request_type: string
          session_id: string | null
          status: string
          updated_at: string
          usage_type: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          amount?: number | null
          city?: string | null
          company?: string | null
          created_at?: string
          email: string
          follow_up_date?: string | null
          full_name: string
          id?: string
          is_read?: boolean
          items?: Json
          landing_page?: string | null
          message?: string | null
          notes?: string
          phone?: string | null
          quote_number?: string | null
          referrer?: string | null
          request_type?: string
          session_id?: string | null
          status?: string
          updated_at?: string
          usage_type?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          amount?: number | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string
          follow_up_date?: string | null
          full_name?: string
          id?: string
          is_read?: boolean
          items?: Json
          landing_page?: string | null
          message?: string | null
          notes?: string
          phone?: string | null
          quote_number?: string | null
          referrer?: string | null
          request_type?: string
          session_id?: string | null
          status?: string
          updated_at?: string
          usage_type?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      contact_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      equipment_categories: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
          usage_type: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          usage_type?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          usage_type?: string
        }
        Relationships: []
      }
      equipment_subcategories: {
        Row: {
          category_slug: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
          usage_type: string
        }
        Insert: {
          category_slug: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          usage_type?: string
        }
        Update: {
          category_slug?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          usage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_subcategories_category_fkey"
            columns: ["category_slug", "usage_type"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["slug", "usage_type"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_text: string | null
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          subtitle: string | null
          tag: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          tag?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          tag?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      home_sections: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
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
      product_ranges: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          label: string
          sort_order: number
          subcategory: string
          updated_at: string
          usage_type: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
          subcategory: string
          updated_at?: string
          usage_type: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
          subcategory?: string
          updated_at?: string
          usage_type?: string
        }
        Relationships: []
      }
      private_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          features: Json | null
          hover_image_url: string | null
          id: string
          image_url: string | null
          is_published: boolean
          is_trending: boolean
          name: string
          range_code: string | null
          short_description: string | null
          sort_order: number
          specs: Json | null
          subcategory: string | null
          updated_at: string
          usage_type: string
          warranty: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          features?: Json | null
          hover_image_url?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          is_trending?: boolean
          name: string
          range_code?: string | null
          short_description?: string | null
          sort_order?: number
          specs?: Json | null
          subcategory?: string | null
          updated_at?: string
          usage_type?: string
          warranty?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          features?: Json | null
          hover_image_url?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          is_trending?: boolean
          name?: string
          range_code?: string | null
          short_description?: string | null
          sort_order?: number
          specs?: Json | null
          subcategory?: string | null
          updated_at?: string
          usage_type?: string
          warranty?: string | null
        }
        Relationships: []
      }
      realisation_images: {
        Row: {
          caption: string
          created_at: string
          id: string
          image_url: string | null
          kind: string
          realisation_id: string
          sort_order: number
        }
        Insert: {
          caption?: string
          created_at?: string
          id?: string
          image_url?: string | null
          kind: string
          realisation_id: string
          sort_order?: number
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: string
          realisation_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      realisations: {
        Row: {
          category: string
          client_name: string | null
          content: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          key_facts: Json
          location: string | null
          slug: string
          subtitle: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          client_name?: string | null
          content?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          key_facts?: Json
          location?: string | null
          slug: string
          subtitle: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          client_name?: string | null
          content?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          key_facts?: Json
          location?: string | null
          slug?: string
          subtitle?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author_name: string
          author_role: string | null
          content: string
          created_at: string
          id: string
          rating: number
          realisation_id: string
        }
        Insert: {
          author_name: string
          author_role?: string | null
          content?: string
          created_at?: string
          id?: string
          rating?: number
          realisation_id: string
        }
        Update: {
          author_name?: string
          author_role?: string | null
          content?: string
          created_at?: string
          id?: string
          rating?: number
          realisation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_realisation_id_fkey"
            columns: ["realisation_id"]
            isOneToOne: false
            referencedRelation: "realisations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
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
      analytics_report: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purge_analytics_events: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      purge_audit_log: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      resync_sheet: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      submit_request: {
        Args: { p: Json }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
