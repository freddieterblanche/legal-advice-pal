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
      bars: {
        Row: {
          created_at: string
          id: string
          name: string
          province: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          province?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          province?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_records: {
        Row: {
          amount_rands: number | null
          created_at: string | null
          firm_id: string | null
          id: string
          payfast_payment_id: string | null
          period_end: string | null
          period_start: string | null
          service_provider_id: string | null
          status: string | null
        }
        Insert: {
          amount_rands?: number | null
          created_at?: string | null
          firm_id?: string | null
          id?: string
          payfast_payment_id?: string | null
          period_end?: string | null
          period_start?: string | null
          service_provider_id?: string | null
          status?: string | null
        }
        Update: {
          amount_rands?: number | null
          created_at?: string | null
          firm_id?: string | null
          id?: string
          payfast_payment_id?: string | null
          period_end?: string | null
          period_start?: string | null
          service_provider_id?: string | null
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
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_lawyer_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      case_service_providers: {
        Row: {
          case_id: string
          created_at: string
          id: string
          notes: string | null
          role: string
          service_provider_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          notes?: string | null
          role?: string
          service_provider_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          role?: string
          service_provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_expert_witnesses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_service_providers_provider_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_service_providers_provider_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
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
      chambers: {
        Row: {
          address: string | null
          bar_id: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          province: string | null
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          bar_id?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          province?: string | null
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          bar_id?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          province?: string | null
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chambers_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
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
      countries: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          sender_email: string | null
          sender_name: string | null
          service_provider_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          sender_email?: string | null
          sender_name?: string | null
          service_provider_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          sender_email?: string | null
          sender_name?: string | null
          service_provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_lawyer_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_lawyer_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_disciplines: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_category: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_category?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_category?: string | null
          slug?: string
        }
        Relationships: []
      }
      firm_branches: {
        Row: {
          address: string | null
          city: string | null
          country: string
          created_at: string
          email: string | null
          firm_id: string
          id: string
          is_head_office: boolean
          name: string
          phone: string | null
          province: string | null
          town_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          email?: string | null
          firm_id: string
          id?: string
          is_head_office?: boolean
          name: string
          phone?: string | null
          province?: string | null
          town_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          email?: string | null
          firm_id?: string
          id?: string
          is_head_office?: boolean
          name?: string
          phone?: string | null
          province?: string | null
          town_id?: string | null
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
          {
            foreignKeyName: "firm_branches_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
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
          email: string | null
          featured_since: string | null
          id: string
          is_featured: boolean
          logo_accent_color: string | null
          logo_url: string | null
          name: string
          phone: string | null
          province: string | null
          registration_number: string | null
          services: string[] | null
          slug: string
          status: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          featured_since?: string | null
          id?: string
          is_featured?: boolean
          logo_accent_color?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          province?: string | null
          registration_number?: string | null
          services?: string[] | null
          slug: string
          status?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          featured_since?: string | null
          id?: string
          is_featured?: boolean
          logo_accent_color?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          province?: string | null
          registration_number?: string | null
          services?: string[] | null
          slug?: string
          status?: string | null
          website?: string | null
        }
        Relationships: []
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
      provider_articles: {
        Row: {
          created_at: string
          id: string
          publication: string | null
          published_date: string | null
          service_provider_id: string
          sort_order: number
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          publication?: string | null
          published_date?: string | null
          service_provider_id: string
          sort_order?: number
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          publication?: string | null
          published_date?: string | null
          service_provider_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_articles_lawyer_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_articles_lawyer_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_branches: {
        Row: {
          branch_id: string
          created_at: string
          service_provider_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          service_provider_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          service_provider_id?: string
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
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_branches_lawyer_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_cases: {
        Row: {
          case_id: string | null
          created_at: string | null
          id: string
          outcome: string | null
          role: string | null
          service_provider_id: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          id?: string
          outcome?: string | null
          role?: string | null
          service_provider_id?: string | null
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          id?: string
          outcome?: string | null
          role?: string | null
          service_provider_id?: string | null
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
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_cases_lawyer_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_disciplines: {
        Row: {
          discipline_id: string
          service_provider_id: string
        }
        Insert: {
          discipline_id: string
          service_provider_id: string
        }
        Update: {
          discipline_id?: string
          service_provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_witness_disciplines_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "expert_disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_disciplines_provider_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_disciplines_provider_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_invites: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          sent_at: string
          service_provider_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          sent_at?: string
          service_provider_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          sent_at?: string
          service_provider_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_invites_lawyer_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: true
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_invites_lawyer_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: true
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_practice_areas: {
        Row: {
          practice_area_id: string
          service_provider_id: string
        }
        Insert: {
          practice_area_id: string
          service_provider_id: string
        }
        Update: {
          practice_area_id?: string
          service_provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_practice_areas_lawyer_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_practice_areas_lawyer_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
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
      provider_reported_cases: {
        Row: {
          case_name: string
          citation: string | null
          court: string | null
          created_at: string
          id: string
          service_provider_id: string
          sort_order: number
          updated_at: string
          url: string | null
          year: number | null
        }
        Insert: {
          case_name: string
          citation?: string | null
          court?: string | null
          created_at?: string
          id?: string
          service_provider_id: string
          sort_order?: number
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Update: {
          case_name?: string
          citation?: string | null
          court?: string | null
          created_at?: string
          id?: string
          service_provider_id?: string
          sort_order?: number
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_reported_cases_lawyer_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_reported_cases_lawyer_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_work_samples: {
        Row: {
          created_at: string
          id: string
          project_date: string | null
          project_name: string
          service_provider_id: string
          synopsis: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_date?: string | null
          project_name: string
          service_provider_id: string
          synopsis?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_date?: string | null
          project_name?: string
          service_provider_id?: string
          synopsis?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_work_samples_provider_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_work_samples_provider_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provinces: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          accolades: string | null
          arbitrator_accreditation: string | null
          arbitrator_experience_years: number | null
          arbitrator_types: string[] | null
          availability_notes: string | null
          avatar_url: string | null
          bar_id: string | null
          bio: string | null
          chambers_id: string | null
          city: string | null
          company_name: string | null
          contact_email: string | null
          country: string
          courts_accepted_in: string[] | null
          created_at: string | null
          cv_url: string | null
          daily_rate_range: string | null
          designation: string | null
          designation_code: string | null
          designation_custom: string | null
          education: string | null
          email: string | null
          employer: string | null
          exclude_from_lawyer_listing: boolean
          featured_since: string | null
          fee_range: string | null
          firm_id: string | null
          first_name: string
          geographic_availability: string | null
          id: string
          is_arbitrator: boolean
          is_claimed: boolean | null
          is_featured: boolean
          is_independent: boolean
          is_mediator: boolean
          is_practice_head: boolean
          is_sector_head: boolean
          is_senior_counsel: boolean
          job_title: string | null
          languages: string[] | null
          last_name: string
          linkedin_url: string | null
          mediator_accreditation: string | null
          mediator_sectors: string[] | null
          mediator_style: string | null
          mobile_phone: string | null
          name_title: string | null
          noteworthy_matters: string | null
          office_phone: string | null
          overview: string | null
          phone: string | null
          practice_head_area: string | null
          profile_id: string | null
          profile_views: number | null
          provider_type: string | null
          province: string | null
          qualifications: string | null
          registration_body: string | null
          reported_cases_notes: string | null
          saflii_author_url: string | null
          search_vector: unknown
          sector_head_area: string | null
          services: string[] | null
          slug: string
          status: string | null
          town_id: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string
          website_url: string | null
          year_of_admission: number | null
        }
        Insert: {
          accolades?: string | null
          arbitrator_accreditation?: string | null
          arbitrator_experience_years?: number | null
          arbitrator_types?: string[] | null
          availability_notes?: string | null
          avatar_url?: string | null
          bar_id?: string | null
          bio?: string | null
          chambers_id?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          country?: string
          courts_accepted_in?: string[] | null
          created_at?: string | null
          cv_url?: string | null
          daily_rate_range?: string | null
          designation?: string | null
          designation_code?: string | null
          designation_custom?: string | null
          education?: string | null
          email?: string | null
          employer?: string | null
          exclude_from_lawyer_listing?: boolean
          featured_since?: string | null
          fee_range?: string | null
          firm_id?: string | null
          first_name: string
          geographic_availability?: string | null
          id?: string
          is_arbitrator?: boolean
          is_claimed?: boolean | null
          is_featured?: boolean
          is_independent?: boolean
          is_mediator?: boolean
          is_practice_head?: boolean
          is_sector_head?: boolean
          is_senior_counsel?: boolean
          job_title?: string | null
          languages?: string[] | null
          last_name: string
          linkedin_url?: string | null
          mediator_accreditation?: string | null
          mediator_sectors?: string[] | null
          mediator_style?: string | null
          mobile_phone?: string | null
          name_title?: string | null
          noteworthy_matters?: string | null
          office_phone?: string | null
          overview?: string | null
          phone?: string | null
          practice_head_area?: string | null
          profile_id?: string | null
          profile_views?: number | null
          provider_type?: string | null
          province?: string | null
          qualifications?: string | null
          registration_body?: string | null
          reported_cases_notes?: string | null
          saflii_author_url?: string | null
          search_vector?: unknown
          sector_head_area?: string | null
          services?: string[] | null
          slug: string
          status?: string | null
          town_id?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          website_url?: string | null
          year_of_admission?: number | null
        }
        Update: {
          accolades?: string | null
          arbitrator_accreditation?: string | null
          arbitrator_experience_years?: number | null
          arbitrator_types?: string[] | null
          availability_notes?: string | null
          avatar_url?: string | null
          bar_id?: string | null
          bio?: string | null
          chambers_id?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          country?: string
          courts_accepted_in?: string[] | null
          created_at?: string | null
          cv_url?: string | null
          daily_rate_range?: string | null
          designation?: string | null
          designation_code?: string | null
          designation_custom?: string | null
          education?: string | null
          email?: string | null
          employer?: string | null
          exclude_from_lawyer_listing?: boolean
          featured_since?: string | null
          fee_range?: string | null
          firm_id?: string | null
          first_name?: string
          geographic_availability?: string | null
          id?: string
          is_arbitrator?: boolean
          is_claimed?: boolean | null
          is_featured?: boolean
          is_independent?: boolean
          is_mediator?: boolean
          is_practice_head?: boolean
          is_sector_head?: boolean
          is_senior_counsel?: boolean
          job_title?: string | null
          languages?: string[] | null
          last_name?: string
          linkedin_url?: string | null
          mediator_accreditation?: string | null
          mediator_sectors?: string[] | null
          mediator_style?: string | null
          mobile_phone?: string | null
          name_title?: string | null
          noteworthy_matters?: string | null
          office_phone?: string | null
          overview?: string | null
          phone?: string | null
          practice_head_area?: string | null
          profile_id?: string | null
          profile_views?: number | null
          provider_type?: string | null
          province?: string | null
          qualifications?: string | null
          registration_body?: string | null
          reported_cases_notes?: string | null
          saflii_author_url?: string | null
          search_vector?: unknown
          sector_head_area?: string | null
          services?: string[] | null
          slug?: string
          status?: string | null
          town_id?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          website_url?: string | null
          year_of_admission?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lawyers_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyers_chambers_id_fkey"
            columns: ["chambers_id"]
            isOneToOne: false
            referencedRelation: "chambers"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "lawyers_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      towns: {
        Row: {
          created_at: string
          id: string
          is_major_city: boolean
          name: string
          province_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_major_city?: boolean
          name: string
          province_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_major_city?: boolean
          name?: string
          province_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "towns_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "lawyer_search_view"
            referencedColumns: ["province_id"]
          },
          {
            foreignKeyName: "towns_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
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
          arbitrator_accreditation: string | null
          arbitrator_experience_years: number | null
          arbitrator_types: string[] | null
          avatar_url: string | null
          case_count: number | null
          chambers_name: string | null
          chambers_slug: string | null
          city: string | null
          created_at: string | null
          designation: string | null
          exclude_from_lawyer_listing: boolean | null
          featured_since: string | null
          firm_name: string | null
          firm_slug: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          is_arbitrator: boolean | null
          is_featured: boolean | null
          is_mediator: boolean | null
          is_senior_counsel: boolean | null
          languages: string[] | null
          last_name: string | null
          mediator_accreditation: string | null
          mediator_sectors: string[] | null
          mediator_style: string | null
          practice_area_slugs: string[] | null
          practice_areas: string[] | null
          profile_views: number | null
          provider_type: string | null
          province: string | null
          province_id: string | null
          province_name: string | null
          province_slug: string | null
          slug: string | null
          status: string | null
          town_id: string | null
          town_name: string | null
          town_slug: string | null
          trial_end_date: string | null
          year_of_admission: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lawyers_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
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
