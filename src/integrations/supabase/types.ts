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
      billing_records: {
        Row: {
          amount_rands: number | null
          created_at: string | null
          firm_id: string | null
          id: string
          lawyer_id: string | null
          payfast_payment_id: string | null
          period_end: string | null
          period_start: string | null
          status: string | null
        }
        Insert: {
          amount_rands?: number | null
          created_at?: string | null
          firm_id?: string | null
          id?: string
          lawyer_id?: string | null
          payfast_payment_id?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
        }
        Update: {
          amount_rands?: number | null
          created_at?: string | null
          firm_id?: string | null
          id?: string
          lawyer_id?: string | null
          payfast_payment_id?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_billing_summary"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "billing_records_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyers"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          case_name: string
          citation: string | null
          court: string | null
          created_at: string | null
          id: string
          saflii_url: string | null
          summary: string | null
          year: number | null
        }
        Insert: {
          case_name: string
          citation?: string | null
          court?: string | null
          created_at?: string | null
          id?: string
          saflii_url?: string | null
          summary?: string | null
          year?: number | null
        }
        Update: {
          case_name?: string
          citation?: string | null
          court?: string | null
          created_at?: string | null
          id?: string
          saflii_url?: string | null
          summary?: string | null
          year?: number | null
        }
        Relationships: []
      }
      config: {
        Row: {
          key: string
          value: string | null
        }
        Insert: {
          key: string
          value?: string | null
        }
        Update: {
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          created_at: string | null
          id: string
          lawyer_id: string | null
          message: string | null
          sender_email: string | null
          sender_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lawyer_id?: string | null
          message?: string | null
          sender_email?: string | null
          sender_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lawyer_id?: string | null
          message?: string | null
          sender_email?: string | null
          sender_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyers"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_branches: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          firm_id: string
          id: string
          is_head_office: boolean
          name: string
          phone: string | null
          province: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          firm_id: string
          id?: string
          is_head_office?: boolean
          name: string
          phone?: string | null
          province?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          is_head_office?: boolean
          name?: string
          phone?: string | null
          province?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firm_branches_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_billing_summary"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "firm_branches_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          province: string | null
          registration_number: string | null
          slug: string
          status: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          province?: string | null
          registration_number?: string | null
          slug: string
          status?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          province?: string | null
          registration_number?: string | null
          slug?: string
          status?: string | null
          website?: string | null
        }
        Relationships: []
      }
      lawyer_articles: {
        Row: {
          created_at: string
          id: string
          lawyer_id: string
          publication: string | null
          published_date: string | null
          sort_order: number
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lawyer_id: string
          publication?: string | null
          published_date?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lawyer_id?: string
          publication?: string | null
          published_date?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_articles_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_articles_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyers"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_branches: {
        Row: {
          branch_id: string
          created_at: string
          lawyer_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          lawyer_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          lawyer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "firm_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_branches_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_branches_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyers"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_cases: {
        Row: {
          case_id: string | null
          created_at: string | null
          id: string
          lawyer_id: string | null
          outcome: string | null
          role: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          id?: string
          lawyer_id?: string | null
          outcome?: string | null
          role?: string | null
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          id?: string
          lawyer_id?: string | null
          outcome?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_cases_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_cases_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_cases_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyers"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_invites: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          lawyer_id: string
          sent_at: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          lawyer_id: string
          sent_at?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          lawyer_id?: string
          sent_at?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_invites_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: true
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_invites_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: true
            referencedRelation: "lawyers"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_practice_areas: {
        Row: {
          lawyer_id: string
          practice_area_id: string
        }
        Insert: {
          lawyer_id: string
          practice_area_id: string
        }
        Update: {
          lawyer_id?: string
          practice_area_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_practice_areas_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_practice_areas_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_practice_areas_practice_area_id_fkey"
            columns: ["practice_area_id"]
            isOneToOne: false
            referencedRelation: "practice_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyers: {
        Row: {
          accolades: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          designation: string | null
          education: string | null
          email: string | null
          firm_id: string
          first_name: string
          id: string
          is_claimed: boolean | null
          last_name: string
          linkedin_url: string | null
          noteworthy_matters: string | null
          overview: string | null
          phone: string | null
          profile_id: string | null
          profile_views: number | null
          province: string | null
          qualifications: string | null
          reported_cases_notes: string | null
          saflii_author_url: string | null
          search_vector: unknown
          slug: string
          status: string | null
          trial_end_date: string | null
          trial_start_date: string | null
        }
        Insert: {
          accolades?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          designation?: string | null
          education?: string | null
          email?: string | null
          firm_id: string
          first_name: string
          id?: string
          is_claimed?: boolean | null
          last_name: string
          linkedin_url?: string | null
          noteworthy_matters?: string | null
          overview?: string | null
          phone?: string | null
          profile_id?: string | null
          profile_views?: number | null
          province?: string | null
          qualifications?: string | null
          reported_cases_notes?: string | null
          saflii_author_url?: string | null
          search_vector?: unknown
          slug: string
          status?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
        }
        Update: {
          accolades?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          designation?: string | null
          education?: string | null
          email?: string | null
          firm_id?: string
          first_name?: string
          id?: string
          is_claimed?: boolean | null
          last_name?: string
          linkedin_url?: string | null
          noteworthy_matters?: string | null
          overview?: string | null
          phone?: string | null
          profile_id?: string | null
          profile_views?: number | null
          province?: string | null
          qualifications?: string | null
          reported_cases_notes?: string | null
          saflii_author_url?: string | null
          search_vector?: unknown
          slug?: string
          status?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lawyers_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_billing_summary"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "lawyers_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_areas: {
        Row: {
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          firm_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          firm_id?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          firm_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_billing_summary"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      firm_billing_summary: {
        Row: {
          active_count: number | null
          firm_id: string | null
          firm_name: string | null
          monthly_cost_rands: number | null
          next_trial_expiry: string | null
          pending_count: number | null
          total_lawyers: number | null
          trial_count: number | null
        }
        Relationships: []
      }
      lawyer_search_view: {
        Row: {
          avatar_url: string | null
          case_count: number | null
          city: string | null
          designation: string | null
          firm_name: string | null
          firm_slug: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          last_name: string | null
          practice_area_slugs: string[] | null
          practice_areas: string[] | null
          profile_views: number | null
          province: string | null
          slug: string | null
          status: string | null
          trial_end_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      expire_trials: { Args: never; Returns: undefined }
      get_my_firm_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
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
