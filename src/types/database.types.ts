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
    PostgrestVersion: "14.4"
  }
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
      agent_job_logs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          log_level: string
          message: string
          payload: Json
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          log_level?: string
          message: string
          payload?: Json
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          log_level?: string
          message?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agent_job_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_job_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_staff_job_queue"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "agent_job_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_staff_my_jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      agent_jobs: {
        Row: {
          assigned_to_user_id: string | null
          created_at: string
          depends_on_job_id: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          input_payload: Json
          job_type: string
          output_payload: Json
          output_summary: string | null
          priority: number
          request_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          created_at?: string
          depends_on_job_id?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_payload?: Json
          job_type: string
          output_payload?: Json
          output_summary?: string | null
          priority?: number
          request_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          created_at?: string
          depends_on_job_id?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_payload?: Json
          job_type?: string
          output_payload?: Json
          output_summary?: string | null
          priority?: number
          request_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_jobs_depends_on_job_id_fkey"
            columns: ["depends_on_job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_depends_on_job_id_fkey"
            columns: ["depends_on_job_id"]
            isOneToOne: false
            referencedRelation: "v_staff_job_queue"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "agent_jobs_depends_on_job_id_fkey"
            columns: ["depends_on_job_id"]
            isOneToOne: false
            referencedRelation: "v_staff_my_jobs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      ai_agent_configs: {
        Row: {
          agent_code: string
          allow_create_draft: boolean | null
          allow_create_research_items: boolean | null
          allow_suggest_report_snapshots: boolean | null
          created_at: string | null
          daily_limit: number | null
          enabled: boolean | null
          id: string
          max_search_results: number | null
          max_tokens: number | null
          model: string | null
          monthly_limit: number | null
          prompt_version: string | null
          provider: string
          safety_level: string | null
          system_prompt_override: string | null
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          agent_code: string
          allow_create_draft?: boolean | null
          allow_create_research_items?: boolean | null
          allow_suggest_report_snapshots?: boolean | null
          created_at?: string | null
          daily_limit?: number | null
          enabled?: boolean | null
          id?: string
          max_search_results?: number | null
          max_tokens?: number | null
          model?: string | null
          monthly_limit?: number | null
          prompt_version?: string | null
          provider?: string
          safety_level?: string | null
          system_prompt_override?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_code?: string
          allow_create_draft?: boolean | null
          allow_create_research_items?: boolean | null
          allow_suggest_report_snapshots?: boolean | null
          created_at?: string | null
          daily_limit?: number | null
          enabled?: boolean | null
          id?: string
          max_search_results?: number | null
          max_tokens?: number | null
          model?: string | null
          monthly_limit?: number | null
          prompt_version?: string | null
          provider?: string
          safety_level?: string | null
          system_prompt_override?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_copilot_runs: {
        Row: {
          agent_code: string
          cost_estimate: number | null
          created_at: string | null
          error_message: string | null
          id: string
          input_summary: Json | null
          model: string | null
          output_summary: Json | null
          provider: string
          request_id: string | null
          staff_id: string | null
          status: string
          token_estimate: number | null
        }
        Insert: {
          agent_code: string
          cost_estimate?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_summary?: Json | null
          model?: string | null
          output_summary?: Json | null
          provider: string
          request_id?: string | null
          staff_id?: string | null
          status?: string
          token_estimate?: number | null
        }
        Update: {
          agent_code?: string
          cost_estimate?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_summary?: Json | null
          model?: string | null
          output_summary?: Json | null
          provider?: string
          request_id?: string | null
          staff_id?: string | null
          status?: string
          token_estimate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "ai_copilot_runs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_response_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          feature_key: string
          response_value: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          feature_key: string
          response_value: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          feature_key?: string
          response_value?: Json
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          error_message: string | null
          estimated_cost: number | null
          feature_key: string
          id: string
          metadata: Json | null
          success: boolean
          timestamp: string
        }
        Insert: {
          error_message?: string | null
          estimated_cost?: number | null
          feature_key: string
          id?: string
          metadata?: Json | null
          success: boolean
          timestamp?: string
        }
        Update: {
          error_message?: string | null
          estimated_cost?: number | null
          feature_key?: string
          id?: string
          metadata?: Json | null
          success?: boolean
          timestamp?: string
        }
        Relationships: []
      }
      alert_events: {
        Row: {
          alert_id: string
          channel: string
          created_at: string
          customer_id: string
          error_message: string | null
          id: string
          old_price: number
          product_id: string
          retry_count: number
          savings_amount: number | null
          savings_pct: number | null
          sent_at: string | null
          status: string
          trigger_price: number
        }
        Insert: {
          alert_id: string
          channel: string
          created_at?: string
          customer_id: string
          error_message?: string | null
          id?: string
          old_price: number
          product_id: string
          retry_count?: number
          savings_amount?: number | null
          savings_pct?: number | null
          sent_at?: string | null
          status?: string
          trigger_price: number
        }
        Update: {
          alert_id?: string
          channel?: string
          created_at?: string
          customer_id?: string
          error_message?: string | null
          id?: string
          old_price?: number
          product_id?: string
          retry_count?: number
          savings_amount?: number | null
          savings_pct?: number | null
          sent_at?: string | null
          status?: string
          trigger_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "alert_events_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "price_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "alert_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "alert_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "alert_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "alert_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "alert_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "alert_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "alert_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "alert_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_link_domains: {
        Row: {
          added_by: string | null
          created_at: string | null
          domain: string
          enabled: boolean
          id: string
          label: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          domain: string
          enabled?: boolean
          id?: string
          label: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          domain?: string
          enabled?: boolean
          id?: string
          label?: string
        }
        Relationships: []
      }
      approvals: {
        Row: {
          approval_notes: string | null
          approval_status: string
          approval_type: string
          approved_at: string | null
          approved_by: string | null
          approved_by_user_id: string | null
          created_at: string
          id: string
          related_entity_id: string | null
          related_entity_type: string
          request_id: string
          updated_at: string | null
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: string
          approval_type: string
          approved_at?: string | null
          approved_by?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          id?: string
          related_entity_id?: string | null
          related_entity_type: string
          request_id: string
          updated_at?: string | null
        }
        Update: {
          approval_notes?: string | null
          approval_status?: string
          approval_type?: string
          approved_at?: string | null
          approved_by?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string
          request_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      bonus_campaigns: {
        Row: {
          created_at: string | null
          created_by_staff_id: string | null
          end_date: string
          id: string
          is_active: boolean | null
          multiplier_boost: number
          start_date: string
          target_role: string | null
          title_ar: string
          title_en: string
        }
        Insert: {
          created_at?: string | null
          created_by_staff_id?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          multiplier_boost?: number
          start_date: string
          target_role?: string | null
          title_ar: string
          title_en: string
        }
        Update: {
          created_at?: string | null
          created_by_staff_id?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          multiplier_boost?: number
          start_date?: string
          target_role?: string | null
          title_ar?: string
          title_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_campaigns_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_qa: {
        Row: {
          answer: string | null
          answerer_id: string | null
          asker_id: string
          created_at: string
          id: string
          product_name: string
          question: string
          status: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          answerer_id?: string | null
          asker_id: string
          created_at?: string
          id?: string
          product_name: string
          question: string
          status?: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          answerer_id?: string | null
          asker_id?: string
          created_at?: string
          id?: string
          product_name?: string
          question?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_qa_answerer_id_fkey"
            columns: ["answerer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_answerer_id_fkey"
            columns: ["answerer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_qa_answerer_id_fkey"
            columns: ["answerer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_answerer_id_fkey"
            columns: ["answerer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_answerer_id_fkey"
            columns: ["answerer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_answerer_id_fkey"
            columns: ["answerer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_answerer_id_fkey"
            columns: ["answerer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_answerer_id_fkey"
            columns: ["answerer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_answerer_id_fkey"
            columns: ["answerer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_qa_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "buyer_qa_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      communication_preferences: {
        Row: {
          allow_marketing: boolean | null
          allow_status_updates: boolean | null
          customer_id: string
          id: string
          language_preference: string | null
          preferred_channel: string | null
          updated_at: string | null
        }
        Insert: {
          allow_marketing?: boolean | null
          allow_status_updates?: boolean | null
          customer_id: string
          id?: string
          language_preference?: string | null
          preferred_channel?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_marketing?: boolean | null
          allow_status_updates?: boolean | null
          customer_id?: string
          id?: string
          language_preference?: string | null
          preferred_channel?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "communication_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "communication_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "communication_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "communication_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "communication_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "communication_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "communication_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          body_template: string
          channel: string
          created_at: string | null
          id: string
          is_active: boolean | null
          language_code: string
          subject_template: string | null
          template_code: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body_template: string
          channel: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language_code?: string
          subject_template?: string | null
          template_code: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body_template?: string
          channel?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language_code?: string
          subject_template?: string | null
          template_code?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      company_experiments: {
        Row: {
          created_at: string | null
          created_by_staff_id: string | null
          hypothesis: string | null
          id: string
          impact_analysis: string | null
          methodology: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_staff_id?: string | null
          hypothesis?: string | null
          id?: string
          impact_analysis?: string | null
          methodology?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_staff_id?: string | null
          hypothesis?: string | null
          id?: string
          impact_analysis?: string | null
          methodology?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_experiments_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_feature_comparisons: {
        Row: {
          advantage_desc_ar: string
          advantage_desc_en: string
          competitor_id: string | null
          created_at: string | null
          feature_name_ar: string
          feature_name_en: string
          id: string
          required_phase_number: number
          status_in_competitor_ar: string
          status_in_competitor_en: string
        }
        Insert: {
          advantage_desc_ar: string
          advantage_desc_en: string
          competitor_id?: string | null
          created_at?: string | null
          feature_name_ar: string
          feature_name_en: string
          id?: string
          required_phase_number: number
          status_in_competitor_ar: string
          status_in_competitor_en: string
        }
        Update: {
          advantage_desc_ar?: string
          advantage_desc_en?: string
          competitor_id?: string | null
          created_at?: string | null
          feature_name_ar?: string
          feature_name_en?: string
          id?: string
          required_phase_number?: number
          status_in_competitor_ar?: string
          status_in_competitor_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_feature_comparisons_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          category_ar: string
          category_en: string
          created_at: string | null
          gap_analysis_ar: string | null
          gap_analysis_en: string | null
          id: string
          name_ar: string
          name_en: string
          strength_rating: number | null
        }
        Insert: {
          category_ar: string
          category_en: string
          created_at?: string | null
          gap_analysis_ar?: string | null
          gap_analysis_en?: string | null
          id?: string
          name_ar: string
          name_en: string
          strength_rating?: number | null
        }
        Update: {
          category_ar?: string
          category_en?: string
          created_at?: string | null
          gap_analysis_ar?: string | null
          gap_analysis_en?: string | null
          id?: string
          name_ar?: string
          name_en?: string
          strength_rating?: number | null
        }
        Relationships: []
      }
      compliance_rules: {
        Row: {
          applies_to_products: boolean
          applies_to_services: boolean
          created_at: string
          decision_mode: string
          id: string
          internal_note: string | null
          is_active: boolean
          keywords_ar: string[]
          keywords_en: string[]
          legal_note: string | null
          requires_human_confirmation: boolean
          rule_category: string
          rule_code: string
          rule_name_ar: string
          rule_name_en: string
          severity_level: number
          updated_at: string
        }
        Insert: {
          applies_to_products?: boolean
          applies_to_services?: boolean
          created_at?: string
          decision_mode: string
          id?: string
          internal_note?: string | null
          is_active?: boolean
          keywords_ar?: string[]
          keywords_en?: string[]
          legal_note?: string | null
          requires_human_confirmation?: boolean
          rule_category: string
          rule_code: string
          rule_name_ar: string
          rule_name_en: string
          severity_level?: number
          updated_at?: string
        }
        Update: {
          applies_to_products?: boolean
          applies_to_services?: boolean
          created_at?: string
          decision_mode?: string
          id?: string
          internal_note?: string | null
          is_active?: boolean
          keywords_ar?: string[]
          keywords_en?: string[]
          legal_note?: string | null
          requires_human_confirmation?: boolean
          rule_category?: string
          rule_code?: string
          rule_name_ar?: string
          rule_name_en?: string
          severity_level?: number
          updated_at?: string
        }
        Relationships: []
      }
      contributor_alerts: {
        Row: {
          alert_type: string
          body_ar: string | null
          body_en: string | null
          contributor_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          title_ar: string
          title_en: string
        }
        Insert: {
          alert_type: string
          body_ar?: string | null
          body_en?: string | null
          contributor_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          title_ar: string
          title_en: string
        }
        Update: {
          alert_type?: string
          body_ar?: string | null
          body_en?: string | null
          contributor_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          title_ar?: string
          title_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributor_alerts_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      contributor_badges: {
        Row: {
          badge_label_ar: string
          badge_label_en: string
          badge_type: string
          contributor_id: string
          earned_at: string
          id: string
          metadata: Json
        }
        Insert: {
          badge_label_ar: string
          badge_label_en: string
          badge_type: string
          contributor_id: string
          earned_at?: string
          id?: string
          metadata?: Json
        }
        Update: {
          badge_label_ar?: string
          badge_label_en?: string
          badge_type?: string
          contributor_id?: string
          earned_at?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contributor_badges_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      contributor_device_fingerprints: {
        Row: {
          contributor_id: string
          first_seen_at: string
          flag_reason: string | null
          id: string
          ip_address: unknown
          is_flagged: boolean
          last_seen_at: string
          screen_fingerprint: string | null
          timezone: string | null
          user_agent: string | null
        }
        Insert: {
          contributor_id: string
          first_seen_at?: string
          flag_reason?: string | null
          id?: string
          ip_address?: unknown
          is_flagged?: boolean
          last_seen_at?: string
          screen_fingerprint?: string | null
          timezone?: string | null
          user_agent?: string | null
        }
        Update: {
          contributor_id?: string
          first_seen_at?: string
          flag_reason?: string | null
          id?: string
          ip_address?: unknown
          is_flagged?: boolean
          last_seen_at?: string
          screen_fingerprint?: string | null
          timezone?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributor_device_fingerprints_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      contributor_hr_reviews: {
        Row: {
          contributor_id: string
          created_at: string
          decided_at: string | null
          fraud_audit_id: string
          id: string
          review_status: string
          staff_notes: string | null
          staff_reviewer_id: string | null
        }
        Insert: {
          contributor_id: string
          created_at?: string
          decided_at?: string | null
          fraud_audit_id: string
          id?: string
          review_status?: string
          staff_notes?: string | null
          staff_reviewer_id?: string | null
        }
        Update: {
          contributor_id?: string
          created_at?: string
          decided_at?: string | null
          fraud_audit_id?: string
          id?: string
          review_status?: string
          staff_notes?: string | null
          staff_reviewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributor_hr_reviews_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributor_hr_reviews_fraud_audit_id_fkey"
            columns: ["fraud_audit_id"]
            isOneToOne: false
            referencedRelation: "fraud_audit_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributor_hr_reviews_staff_reviewer_id_fkey"
            columns: ["staff_reviewer_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      contributor_levels: {
        Row: {
          badge_color: string
          badge_icon: string
          cash_multiplier: number
          created_at: string
          description_ar: string
          description_en: string
          id: string
          is_active: boolean
          level_number: number
          monthly_cap_egp: number | null
          name_ar: string
          name_en: string
          required_active_referrals: number
          required_lifetime_points: number | null
          required_trust_score: number | null
          unlocked_features: Json
        }
        Insert: {
          badge_color?: string
          badge_icon?: string
          cash_multiplier?: number
          created_at?: string
          description_ar: string
          description_en: string
          id?: string
          is_active?: boolean
          level_number: number
          monthly_cap_egp?: number | null
          name_ar: string
          name_en: string
          required_active_referrals: number
          required_lifetime_points?: number | null
          required_trust_score?: number | null
          unlocked_features?: Json
        }
        Update: {
          badge_color?: string
          badge_icon?: string
          cash_multiplier?: number
          created_at?: string
          description_ar?: string
          description_en?: string
          id?: string
          is_active?: boolean
          level_number?: number
          monthly_cap_egp?: number | null
          name_ar?: string
          name_en?: string
          required_active_referrals?: number
          required_lifetime_points?: number | null
          required_trust_score?: number | null
          unlocked_features?: Json
        }
        Relationships: []
      }
      contributor_notifications: {
        Row: {
          contributor_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message_ar: string
          message_en: string
          type: string | null
        }
        Insert: {
          contributor_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_ar: string
          message_en: string
          type?: string | null
        }
        Update: {
          contributor_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_ar?: string
          message_en?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributor_notifications_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      contributor_referrals: {
        Row: {
          created_at: string
          first_activity_at: string | null
          id: string
          level: number
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          first_activity_at?: string | null
          id?: string
          level?: number
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          first_activity_at?: string | null
          id?: string
          level?: number
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributor_referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributor_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      contributor_reviews: {
        Row: {
          comment: string | null
          contributor_id: string
          created_at: string
          customer_id: string | null
          id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          contributor_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          rating: number
        }
        Update: {
          comment?: string | null
          contributor_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "contributor_reviews_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      contributor_risk_scores: {
        Row: {
          account_state: string
          contributor_id: string
          last_evaluated_at: string
          risk_score: number
        }
        Insert: {
          account_state?: string
          contributor_id: string
          last_evaluated_at?: string
          risk_score?: number
        }
        Update: {
          account_state?: string
          contributor_id?: string
          last_evaluated_at?: string
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "contributor_risk_scores_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: true
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      contributor_scarcity_limits: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          is_active: boolean
          max_slots: number
          taken_slots: number
          updated_at: string
        }
        Insert: {
          closes_at: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_slots?: number
          taken_slots?: number
          updated_at?: string
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_slots?: number
          taken_slots?: number
          updated_at?: string
        }
        Relationships: []
      }
      contributor_streaks: {
        Row: {
          best_daily_streak: number
          contributor_id: string
          daily_streak_count: number
          last_active_date: string | null
          monthly_streak_count: number
          streak_bonus_active: boolean
          streak_multiplier: number
          updated_at: string
          weekly_streak_count: number
        }
        Insert: {
          best_daily_streak?: number
          contributor_id: string
          daily_streak_count?: number
          last_active_date?: string | null
          monthly_streak_count?: number
          streak_bonus_active?: boolean
          streak_multiplier?: number
          updated_at?: string
          weekly_streak_count?: number
        }
        Update: {
          best_daily_streak?: number
          contributor_id?: string
          daily_streak_count?: number
          last_active_date?: string | null
          monthly_streak_count?: number
          streak_bonus_active?: boolean
          streak_multiplier?: number
          updated_at?: string
          weekly_streak_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "contributor_streaks_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: true
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      contributor_submissions: {
        Row: {
          contributor_id: string
          created_at: string
          details: Json
          id: string
          price_reported: number | null
          product_id: string | null
          status: string
          submission_type: string
          vendor_id: string | null
          verified_at: string | null
        }
        Insert: {
          contributor_id: string
          created_at?: string
          details?: Json
          id?: string
          price_reported?: number | null
          product_id?: string | null
          status?: string
          submission_type: string
          vendor_id?: string | null
          verified_at?: string | null
        }
        Update: {
          contributor_id?: string
          created_at?: string
          details?: Json
          id?: string
          price_reported?: number | null
          product_id?: string | null
          status?: string
          submission_type?: string
          vendor_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributor_submissions_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      contributor_verification_requests: {
        Row: {
          ai_confidence_score: number | null
          ai_risk_flags: string[] | null
          ai_screening_result: Json | null
          contributor_id: string
          created_at: string
          hr_decided_at: string | null
          hr_decision: string
          hr_notes: string | null
          hr_reviewer_staff_id: string | null
          id: string
          id_back_path: string | null
          id_front_path: string | null
          otp_verified: boolean
          otp_verified_at: string | null
          phone_number: string
          selfie_path: string | null
          updated_at: string
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_risk_flags?: string[] | null
          ai_screening_result?: Json | null
          contributor_id: string
          created_at?: string
          hr_decided_at?: string | null
          hr_decision?: string
          hr_notes?: string | null
          hr_reviewer_staff_id?: string | null
          id?: string
          id_back_path?: string | null
          id_front_path?: string | null
          otp_verified?: boolean
          otp_verified_at?: string | null
          phone_number: string
          selfie_path?: string | null
          updated_at?: string
        }
        Update: {
          ai_confidence_score?: number | null
          ai_risk_flags?: string[] | null
          ai_screening_result?: Json | null
          contributor_id?: string
          created_at?: string
          hr_decided_at?: string | null
          hr_decision?: string
          hr_notes?: string | null
          hr_reviewer_staff_id?: string | null
          id?: string
          id_back_path?: string | null
          id_front_path?: string | null
          otp_verified?: boolean
          otp_verified_at?: string | null
          phone_number?: string
          selfie_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributor_verification_requests_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributor_verification_requests_hr_reviewer_staff_id_fkey"
            columns: ["hr_reviewer_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      contributor_wallets: {
        Row: {
          balance_egp: number
          contributor_id: string
          credit_balance: number
          id: string
          is_frozen: boolean
          last_transaction_at: string | null
          lifetime_earned_egp: number
          lifetime_withdrawn_egp: number
          pending_withdrawal_egp: number
          points_balance: number
          updated_at: string
        }
        Insert: {
          balance_egp?: number
          contributor_id: string
          credit_balance?: number
          id?: string
          is_frozen?: boolean
          last_transaction_at?: string | null
          lifetime_earned_egp?: number
          lifetime_withdrawn_egp?: number
          pending_withdrawal_egp?: number
          points_balance?: number
          updated_at?: string
        }
        Update: {
          balance_egp?: number
          contributor_id?: string
          credit_balance?: number
          id?: string
          is_frozen?: boolean
          last_transaction_at?: string | null
          lifetime_earned_egp?: number
          lifetime_withdrawn_egp?: number
          pending_withdrawal_egp?: number
          points_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributor_wallets_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: true
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      contributor_withdrawals: {
        Row: {
          amount_egp: number
          contributor_id: string
          created_at: string
          fraud_audit_id: string | null
          id: string
          payment_details: Json
          payment_method: string
          processed_at: string | null
          rejection_reason: string | null
          staff_reviewer_id: string | null
          status: string
          wallet_id: string
        }
        Insert: {
          amount_egp: number
          contributor_id: string
          created_at?: string
          fraud_audit_id?: string | null
          id?: string
          payment_details: Json
          payment_method: string
          processed_at?: string | null
          rejection_reason?: string | null
          staff_reviewer_id?: string | null
          status?: string
          wallet_id: string
        }
        Update: {
          amount_egp?: number
          contributor_id?: string
          created_at?: string
          fraud_audit_id?: string | null
          id?: string
          payment_details?: Json
          payment_method?: string
          processed_at?: string | null
          rejection_reason?: string | null
          staff_reviewer_id?: string | null
          status?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributor_withdrawals_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributor_withdrawals_fraud_audit_id_fkey"
            columns: ["fraud_audit_id"]
            isOneToOne: false
            referencedRelation: "fraud_audit_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributor_withdrawals_staff_reviewer_id_fkey"
            columns: ["staff_reviewer_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributor_withdrawals_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "contributor_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      contributors: {
        Row: {
          active_network_count: number | null
          active_referral_count: number
          approved_at: string | null
          auth_user_id: string | null
          created_at: string
          decay_multiplier: number | null
          device_fingerprint: string | null
          earning_multiplier: number
          failed_withdrawal_attempts: number | null
          full_name: string
          governorate: string | null
          id: string
          id_verified_at: string | null
          last_activity_at: string | null
          last_ip_address: string | null
          monthly_cap_egp: number | null
          national_id_number: string | null
          network_health_score: number
          phone_number: string
          phone_verified_at: string | null
          referral_bonus_earned_egp: number | null
          referral_code: string
          referral_count: number
          referred_by_id: string | null
          role: string
          status: string
          trust_score: number
          updated_at: string
        }
        Insert: {
          active_network_count?: number | null
          active_referral_count?: number
          approved_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          decay_multiplier?: number | null
          device_fingerprint?: string | null
          earning_multiplier?: number
          failed_withdrawal_attempts?: number | null
          full_name: string
          governorate?: string | null
          id?: string
          id_verified_at?: string | null
          last_activity_at?: string | null
          last_ip_address?: string | null
          monthly_cap_egp?: number | null
          national_id_number?: string | null
          network_health_score?: number
          phone_number: string
          phone_verified_at?: string | null
          referral_bonus_earned_egp?: number | null
          referral_code: string
          referral_count?: number
          referred_by_id?: string | null
          role?: string
          status?: string
          trust_score?: number
          updated_at?: string
        }
        Update: {
          active_network_count?: number | null
          active_referral_count?: number
          approved_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          decay_multiplier?: number | null
          device_fingerprint?: string | null
          earning_multiplier?: number
          failed_withdrawal_attempts?: number | null
          full_name?: string
          governorate?: string | null
          id?: string
          id_verified_at?: string | null
          last_activity_at?: string | null
          last_ip_address?: string | null
          monthly_cap_egp?: number | null
          national_id_number?: string | null
          network_health_score?: number
          phone_number?: string
          phone_verified_at?: string | null
          referral_bonus_earned_egp?: number | null
          referral_code?: string
          referral_count?: number
          referred_by_id?: string | null
          role?: string
          status?: string
          trust_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributors_referred_by_id_fkey"
            columns: ["referred_by_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_ads_performances: {
        Row: {
          best_post_desc: string | null
          clicks: number | null
          deals: number | null
          id: string
          leads: number | null
          platform: string
          reach: number | null
          spend: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          best_post_desc?: string | null
          clicks?: number | null
          deals?: number | null
          id?: string
          leads?: number | null
          platform: string
          reach?: number | null
          spend?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          best_post_desc?: string | null
          clicks?: number | null
          deals?: number | null
          id?: string
          leads?: number | null
          platform?: string
          reach?: number | null
          spend?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_contacts: {
        Row: {
          contact_type: string
          contact_value: string
          created_at: string
          customer_id: string
          id: string
          is_primary: boolean
          is_verified: boolean
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          contact_type: string
          contact_value: string
          created_at?: string
          customer_id: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_type?: string
          contact_value?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      customer_discovery_interviews: {
        Row: {
          additional_notes: string | null
          biggest_frustration: string | null
          created_at: string | null
          customer_id: string
          how_searches_currently: string | null
          id: string
          interviewer_id: string | null
          potential_commission_egp: number | null
          updated_at: string | null
          used_features: string | null
          visited_pages: string | null
          what_wanted_to_buy: string | null
          will_pay: boolean | null
        }
        Insert: {
          additional_notes?: string | null
          biggest_frustration?: string | null
          created_at?: string | null
          customer_id: string
          how_searches_currently?: string | null
          id?: string
          interviewer_id?: string | null
          potential_commission_egp?: number | null
          updated_at?: string | null
          used_features?: string | null
          visited_pages?: string | null
          what_wanted_to_buy?: string | null
          will_pay?: boolean | null
        }
        Update: {
          additional_notes?: string | null
          biggest_frustration?: string | null
          created_at?: string | null
          customer_id?: string
          how_searches_currently?: string | null
          id?: string
          interviewer_id?: string | null
          potential_commission_egp?: number | null
          updated_at?: string | null
          used_features?: string | null
          visited_pages?: string | null
          what_wanted_to_buy?: string | null
          will_pay?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_discovery_interviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_discovery_interviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_discovery_interviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_discovery_interviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_discovery_interviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_discovery_interviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_discovery_interviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_discovery_interviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_discovery_interviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_discovery_interviews_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_disputes: {
        Row: {
          created_at: string
          customer_phone: string
          description: string
          dispute_type: string
          id: string
          request_id: string
          resolution_notes: string | null
          resolved_at: string | null
          staff_reviewer_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          customer_phone: string
          description: string
          dispute_type: string
          id?: string
          request_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          staff_reviewer_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          customer_phone?: string
          description?: string
          dispute_type?: string
          id?: string
          request_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          staff_reviewer_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "customer_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_disputes_staff_reviewer_id_fkey"
            columns: ["staff_reviewer_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_fee_phases: {
        Row: {
          created_at: string
          fee_amount_egp: number
          first_request_free_with_verified_phone: boolean
          id: string
          is_current_phase: boolean
          phase_name: string
          phase_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee_amount_egp?: number
          first_request_free_with_verified_phone?: boolean
          id?: string
          is_current_phase?: boolean
          phase_name: string
          phase_order: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee_amount_egp?: number
          first_request_free_with_verified_phone?: boolean
          id?: string
          is_current_phase?: boolean
          phase_name?: string
          phase_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      customer_intelligence_events: {
        Row: {
          customer_id: string
          event_type: string
          id: string
          metadata: Json | null
          occurred_at: string | null
          request_id: string | null
        }
        Insert: {
          customer_id: string
          event_type: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          request_id?: string | null
        }
        Update: {
          customer_id?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_intelligence_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "customer_intelligence_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      customer_points_ledger: {
        Row: {
          action_type: string
          created_at: string
          customer_id: string
          id: string
          points: number
          reference_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          customer_id: string
          id?: string
          points: number
          reference_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          customer_id?: string
          id?: string
          points?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      customer_requests: {
        Row: {
          additional_notes: string | null
          category: string
          created_at: string
          customer_id: string | null
          customer_name: string
          id: string
          is_expanded_by_ai: boolean | null
          max_price: number | null
          product_name: string
          source_deal_id: string | null
          status: string
          target_location: string
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          category: string
          created_at?: string
          customer_id?: string | null
          customer_name: string
          id?: string
          is_expanded_by_ai?: boolean | null
          max_price?: number | null
          product_name: string
          source_deal_id?: string | null
          status?: string
          target_location: string
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          category?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          is_expanded_by_ai?: boolean | null
          max_price?: number | null
          product_name?: string
          source_deal_id?: string | null
          status?: string
          target_location?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_requests_source_deal_id_fkey"
            columns: ["source_deal_id"]
            isOneToOne: false
            referencedRelation: "marketplace_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_score_snapshots: {
        Row: {
          calculated_at: string | null
          conversion_score: number | null
          customer_id: string
          id: string
          loyalty_score: number | null
          seriousness_score: number | null
        }
        Insert: {
          calculated_at?: string | null
          conversion_score?: number | null
          customer_id: string
          id?: string
          loyalty_score?: number | null
          seriousness_score?: number | null
        }
        Update: {
          calculated_at?: string | null
          conversion_score?: number | null
          customer_id?: string
          id?: string
          loyalty_score?: number | null
          seriousness_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_score_snapshots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_score_snapshots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_score_snapshots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_score_snapshots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_score_snapshots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_score_snapshots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_score_snapshots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_score_snapshots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_score_snapshots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          assigned_at: string | null
          customer_id: string
          id: string
          segment_code: string
        }
        Insert: {
          assigned_at?: string | null
          customer_id: string
          id?: string
          segment_code: string
        }
        Update: {
          assigned_at?: string | null
          customer_id?: string
          id?: string
          segment_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_segments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_segments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_segments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_segments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_segments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_segments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_segments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_segments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      customer_subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          customer_id: string
          ends_at: string | null
          id: string
          plan_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          customer_id: string
          ends_at?: string | null
          id?: string
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          customer_id?: string
          ends_at?: string | null
          id?: string
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_verification_events: {
        Row: {
          actor_staff_id: string | null
          contact_type: string
          contact_value: string | null
          created_at: string
          customer_id: string
          event_type: string
          id: string
          metadata: Json
          note: string | null
        }
        Insert: {
          actor_staff_id?: string | null
          contact_type?: string
          contact_value?: string | null
          created_at?: string
          customer_id: string
          event_type: string
          id?: string
          metadata?: Json
          note?: string | null
        }
        Update: {
          actor_staff_id?: string | null
          contact_type?: string
          contact_value?: string | null
          created_at?: string
          customer_id?: string
          event_type?: string
          id?: string
          metadata?: Json
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_verification_events_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_verification_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_verification_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_verification_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_verification_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_verification_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_verification_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_verification_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_verification_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_verification_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      customers: {
        Row: {
          archived_at: string | null
          auth_user_id: string | null
          block_reason: string | null
          blocked_at: string | null
          created_at: string
          customer_code: string
          email: string | null
          free_trial_used_at: string | null
          full_name: string
          governorate: string | null
          has_used_free_first_request: boolean
          id: string
          is_archived: boolean | null
          phone_number_normalized: string | null
          phone_number_raw: string | null
          phone_verified: boolean
          phone_verified_at: string | null
          preferred_contact_method: string | null
          preferred_language: string
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          auth_user_id?: string | null
          block_reason?: string | null
          blocked_at?: string | null
          created_at?: string
          customer_code: string
          email?: string | null
          free_trial_used_at?: string | null
          full_name: string
          governorate?: string | null
          has_used_free_first_request?: boolean
          id?: string
          is_archived?: boolean | null
          phone_number_normalized?: string | null
          phone_number_raw?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          preferred_contact_method?: string | null
          preferred_language?: string
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          auth_user_id?: string | null
          block_reason?: string | null
          blocked_at?: string | null
          created_at?: string
          customer_code?: string
          email?: string | null
          free_trial_used_at?: string | null
          full_name?: string
          governorate?: string | null
          has_used_free_first_request?: boolean
          id?: string
          is_archived?: boolean | null
          phone_number_normalized?: string | null
          phone_number_raw?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          preferred_contact_method?: string | null
          preferred_language?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_moat_weekly_metrics: {
        Row: {
          collected_prices: number
          completed_deals: number
          created_at: string | null
          id: string
          negotiation_data: number
          real_reviews: number
          recorded_date: string | null
          unique_products: number
          updated_at: string | null
          verified_merchants: number
        }
        Insert: {
          collected_prices?: number
          completed_deals?: number
          created_at?: string | null
          id?: string
          negotiation_data?: number
          real_reviews?: number
          recorded_date?: string | null
          unique_products?: number
          updated_at?: string | null
          verified_merchants?: number
        }
        Update: {
          collected_prices?: number
          completed_deals?: number
          created_at?: string | null
          id?: string
          negotiation_data?: number
          real_reviews?: number
          recorded_date?: string | null
          unique_products?: number
          updated_at?: string | null
          verified_merchants?: number
        }
        Relationships: []
      }
      economy_config: {
        Row: {
          config_key: string
          daily_limit: number | null
          description_ar: string | null
          description_en: string | null
          id: string
          is_system_controlled: boolean
          monthly_limit: number | null
          status: string
          updated_at: string
          updated_by_staff_id: string | null
          value: Json
        }
        Insert: {
          config_key: string
          daily_limit?: number | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_system_controlled?: boolean
          monthly_limit?: number | null
          status?: string
          updated_at?: string
          updated_by_staff_id?: string | null
          value?: Json
        }
        Update: {
          config_key?: string
          daily_limit?: number | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_system_controlled?: boolean
          monthly_limit?: number | null
          status?: string
          updated_at?: string
          updated_by_staff_id?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "economy_config_updated_by_staff_id_fkey"
            columns: ["updated_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      economy_stabilizer_events: {
        Row: {
          action_taken: string | null
          created_at: string
          event_type: string
          id: string
          new_multiplier: number | null
          old_multiplier: number | null
          staff_override_id: string | null
          threshold_value: number | null
          trigger_metric: string | null
          trigger_value: number | null
          triggered_by: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          event_type: string
          id?: string
          new_multiplier?: number | null
          old_multiplier?: number | null
          staff_override_id?: string | null
          threshold_value?: number | null
          trigger_metric?: string | null
          trigger_value?: number | null
          triggered_by?: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          event_type?: string
          id?: string
          new_multiplier?: number | null
          old_multiplier?: number | null
          staff_override_id?: string | null
          threshold_value?: number | null
          trigger_metric?: string | null
          trigger_value?: number | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "economy_stabilizer_events_staff_override_id_fkey"
            columns: ["staff_override_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      economy_stabilizer_snapshots: {
        Row: {
          active_contributors: number
          auto_action_taken: string | null
          computed_at: string
          contributor_growth_pct_wow: number | null
          id: string
          multiplier_adjustment: number
          new_contributors: number
          new_referrals: number
          payout_growth_pct_wow: number | null
          snapshot_date: string
          stabilizer_status: string
          total_payouts_egp: number
          total_referral_rewards_egp: number
          total_task_rewards_egp: number
        }
        Insert: {
          active_contributors?: number
          auto_action_taken?: string | null
          computed_at?: string
          contributor_growth_pct_wow?: number | null
          id?: string
          multiplier_adjustment?: number
          new_contributors?: number
          new_referrals?: number
          payout_growth_pct_wow?: number | null
          snapshot_date: string
          stabilizer_status?: string
          total_payouts_egp?: number
          total_referral_rewards_egp?: number
          total_task_rewards_egp?: number
        }
        Update: {
          active_contributors?: number
          auto_action_taken?: string | null
          computed_at?: string
          contributor_growth_pct_wow?: number | null
          id?: string
          multiplier_adjustment?: number
          new_contributors?: number
          new_referrals?: number
          payout_growth_pct_wow?: number | null
          snapshot_date?: string
          stabilizer_status?: string
          total_payouts_egp?: number
          total_referral_rewards_egp?: number
          total_task_rewards_egp?: number
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          category: string
          config: Json | null
          created_at: string | null
          description: string | null
          enabled: boolean
          id: string
          key: string
          title: string
          title_ar: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string
          config?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          title: string
          title_ar: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          config?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          title?: string
          title_ar?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      feature_flags_audit: {
        Row: {
          changed_by: string | null
          changed_by_role: string | null
          created_at: string | null
          flag_key: string
          id: string
          new_value: boolean | null
          old_value: boolean | null
        }
        Insert: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string | null
          flag_key: string
          id?: string
          new_value?: boolean | null
          old_value?: boolean | null
        }
        Update: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string | null
          flag_key?: string
          id?: string
          new_value?: boolean | null
          old_value?: boolean | null
        }
        Relationships: []
      }
      financial_categories: {
        Row: {
          created_at: string
          id: string
          name_ar: string
          name_en: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name_ar: string
          name_en: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          name_ar?: string
          name_en?: string
          type?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          transaction_date: string
          type: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          transaction_date?: string
          type: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      findora_deal_inquiries: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string
          deal_id: string | null
          id: string
          inquiry_status: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone: string
          deal_id?: string | null
          id?: string
          inquiry_status?: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string
          deal_id?: string | null
          id?: string
          inquiry_status?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "findora_deal_inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "findora_deal_inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findora_deal_inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "findora_deal_inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "findora_deal_inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "findora_deal_inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "findora_deal_inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "findora_deal_inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "findora_deal_inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "findora_deal_inquiries_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "findora_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      findora_deals: {
        Row: {
          category: string | null
          created_at: string | null
          created_by_staff_id: string | null
          currency_code: string | null
          deal_price: number
          deal_status: string
          description_ar: string | null
          description_en: string | null
          display_order: number | null
          ends_at: string | null
          featured_on_homepage: boolean | null
          id: string
          image_path: string | null
          is_active: boolean | null
          original_price: number | null
          slug: string
          starts_at: string | null
          stock_quantity: number | null
          title_ar: string
          title_en: string
          updated_at: string | null
          updated_by_staff_id: string | null
          vendor_id: string | null
          vendor_name_snapshot: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by_staff_id?: string | null
          currency_code?: string | null
          deal_price: number
          deal_status?: string
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          ends_at?: string | null
          featured_on_homepage?: boolean | null
          id?: string
          image_path?: string | null
          is_active?: boolean | null
          original_price?: number | null
          slug: string
          starts_at?: string | null
          stock_quantity?: number | null
          title_ar: string
          title_en: string
          updated_at?: string | null
          updated_by_staff_id?: string | null
          vendor_id?: string | null
          vendor_name_snapshot?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by_staff_id?: string | null
          currency_code?: string | null
          deal_price?: number
          deal_status?: string
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          ends_at?: string | null
          featured_on_homepage?: boolean | null
          id?: string
          image_path?: string | null
          is_active?: boolean | null
          original_price?: number | null
          slug?: string
          starts_at?: string | null
          stock_quantity?: number | null
          title_ar?: string
          title_en?: string
          updated_at?: string | null
          updated_by_staff_id?: string | null
          vendor_id?: string | null
          vendor_name_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "findora_deals_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findora_deals_updated_by_staff_id_fkey"
            columns: ["updated_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findora_deals_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      flywheel_stages: {
        Row: {
          created_at: string
          current_value: number
          display_order: number
          id: string
          metric_key: string
          name_ar: string
          name_en: string
          slug: string
          target_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          display_order?: number
          id?: string
          metric_key: string
          name_ar: string
          name_en: string
          slug: string
          target_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          display_order?: number
          id?: string
          metric_key?: string
          name_ar?: string
          name_en?: string
          slug?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      founder_accountability_items: {
        Row: {
          category: string
          created_at: string | null
          details_ar: string | null
          details_en: string | null
          id: string
          meta_tag: string | null
          title_ar: string
          title_en: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          details_ar?: string | null
          details_en?: string | null
          id?: string
          meta_tag?: string | null
          title_ar: string
          title_en: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          details_ar?: string | null
          details_en?: string | null
          id?: string
          meta_tag?: string | null
          title_ar?: string
          title_en?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      founder_weekly_logs: {
        Row: {
          biggest_achievement: string | null
          blockers: string | null
          created_at: string | null
          customers_contacted: number | null
          distracted_from_phase: string | null
          distraction_score: number | null
          hours_built: number | null
          id: string
          merchants_contacted: number | null
          next_week_focus: string | null
          not_done: string | null
          progress_comparison: string | null
          progress_rating: number | null
          staff_id: string | null
          top_achievements: string | null
          updated_at: string | null
          week_start_date: string
        }
        Insert: {
          biggest_achievement?: string | null
          blockers?: string | null
          created_at?: string | null
          customers_contacted?: number | null
          distracted_from_phase?: string | null
          distraction_score?: number | null
          hours_built?: number | null
          id?: string
          merchants_contacted?: number | null
          next_week_focus?: string | null
          not_done?: string | null
          progress_comparison?: string | null
          progress_rating?: number | null
          staff_id?: string | null
          top_achievements?: string | null
          updated_at?: string | null
          week_start_date: string
        }
        Update: {
          biggest_achievement?: string | null
          blockers?: string | null
          created_at?: string | null
          customers_contacted?: number | null
          distracted_from_phase?: string | null
          distraction_score?: number | null
          hours_built?: number | null
          id?: string
          merchants_contacted?: number | null
          next_week_focus?: string | null
          not_done?: string | null
          progress_comparison?: string | null
          progress_rating?: number | null
          staff_id?: string | null
          top_achievements?: string | null
          updated_at?: string | null
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "founder_weekly_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_alerts: {
        Row: {
          alert_level: string
          alert_type: string
          contributor_id: string
          created_at: string
          description: string
          id: string
          related_transaction_id: string | null
          resolved_at: string | null
          resolved_by_staff_id: string | null
          status: string
        }
        Insert: {
          alert_level: string
          alert_type: string
          contributor_id: string
          created_at?: string
          description: string
          id?: string
          related_transaction_id?: string | null
          resolved_at?: string | null
          resolved_by_staff_id?: string | null
          status?: string
        }
        Update: {
          alert_level?: string
          alert_type?: string
          contributor_id?: string
          created_at?: string
          description?: string
          id?: string
          related_transaction_id?: string | null
          resolved_at?: string | null
          resolved_by_staff_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_related_transaction_id_fkey"
            columns: ["related_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_resolved_by_staff_id_fkey"
            columns: ["resolved_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_audit_log: {
        Row: {
          action_type: string
          contributor_id: string
          created_at: string
          decision: string
          id: string
          metadata: Json
          risk_score: number
          trigger_reason: string
        }
        Insert: {
          action_type: string
          contributor_id: string
          created_at?: string
          decision: string
          id?: string
          metadata?: Json
          risk_score: number
          trigger_reason: string
        }
        Update: {
          action_type?: string
          contributor_id?: string
          created_at?: string
          decision?: string
          id?: string
          metadata?: Json
          risk_score?: number
          trigger_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_audit_log_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      group_buying_members: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          pool_id: string
          request_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          pool_id: string
          request_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          pool_id?: string
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_buying_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "group_buying_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_buying_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "group_buying_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "group_buying_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "group_buying_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "group_buying_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "group_buying_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "group_buying_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "group_buying_members_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "group_buying_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "group_buying_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      group_buying_pools: {
        Row: {
          category: string
          created_at: string
          current_quantity: number
          expires_at: string
          id: string
          product_name: string
          status: string
          target_quantity: number
        }
        Insert: {
          category: string
          created_at?: string
          current_quantity?: number
          expires_at: string
          id?: string
          product_name: string
          status?: string
          target_quantity?: number
        }
        Update: {
          category?: string
          created_at?: string
          current_quantity?: number
          expires_at?: string
          id?: string
          product_name?: string
          status?: string
          target_quantity?: number
        }
        Relationships: []
      }
      growth_channels: {
        Row: {
          cac_ar: string
          cac_en: string
          created_at: string | null
          id: string
          name_ar: string
          name_en: string
          reach_ar: string
          reach_en: string
          status: string | null
          tip_ar: string
          tip_en: string
        }
        Insert: {
          cac_ar: string
          cac_en: string
          created_at?: string | null
          id?: string
          name_ar: string
          name_en: string
          reach_ar: string
          reach_en: string
          status?: string | null
          tip_ar: string
          tip_en: string
        }
        Update: {
          cac_ar?: string
          cac_en?: string
          created_at?: string | null
          id?: string
          name_ar?: string
          name_en?: string
          reach_ar?: string
          reach_en?: string
          status?: string | null
          tip_ar?: string
          tip_en?: string
        }
        Relationships: []
      }
      growth_content_plan: {
        Row: {
          body_ar: string
          body_en: string
          created_at: string | null
          day_number: number
          hook_ar: string
          hook_en: string
          id: string
          image_prompt_ar: string | null
          image_prompt_en: string | null
          is_published: boolean | null
          platform: string
        }
        Insert: {
          body_ar: string
          body_en: string
          created_at?: string | null
          day_number: number
          hook_ar: string
          hook_en: string
          id?: string
          image_prompt_ar?: string | null
          image_prompt_en?: string | null
          is_published?: boolean | null
          platform: string
        }
        Update: {
          body_ar?: string
          body_en?: string
          created_at?: string | null
          day_number?: number
          hook_ar?: string
          hook_en?: string
          id?: string
          image_prompt_ar?: string | null
          image_prompt_en?: string | null
          is_published?: boolean | null
          platform?: string
        }
        Relationships: []
      }
      homepage_announcements: {
        Row: {
          announcement_type: string
          body_ar: string | null
          body_en: string | null
          created_at: string | null
          created_by_staff_id: string | null
          ends_at: string | null
          id: string
          image_path: string | null
          is_active: boolean | null
          is_dismissible: boolean | null
          link_url: string | null
          priority: number | null
          slug: string
          starts_at: string | null
          title_ar: string
          title_en: string
          updated_at: string | null
          updated_by_staff_id: string | null
        }
        Insert: {
          announcement_type?: string
          body_ar?: string | null
          body_en?: string | null
          created_at?: string | null
          created_by_staff_id?: string | null
          ends_at?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean | null
          is_dismissible?: boolean | null
          link_url?: string | null
          priority?: number | null
          slug: string
          starts_at?: string | null
          title_ar: string
          title_en: string
          updated_at?: string | null
          updated_by_staff_id?: string | null
        }
        Update: {
          announcement_type?: string
          body_ar?: string | null
          body_en?: string | null
          created_at?: string | null
          created_by_staff_id?: string | null
          ends_at?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean | null
          is_dismissible?: boolean | null
          link_url?: string | null
          priority?: number | null
          slug?: string
          starts_at?: string | null
          title_ar?: string
          title_en?: string
          updated_at?: string | null
          updated_by_staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_announcements_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_announcements_updated_by_staff_id_fkey"
            columns: ["updated_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note_text: string
          note_type: string
          related_entity_id: string
          related_entity_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          note_text: string
          note_type?: string
          related_entity_id: string
          related_entity_type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note_text?: string
          note_type?: string
          related_entity_id?: string
          related_entity_type?: string
        }
        Relationships: []
      }
      investor_metrics_snapshots: {
        Row: {
          avg_customer_acquisition_cost_egp: number
          avg_lifetime_value_egp: number
          avg_margin_pct: number
          created_at: string
          daily_active_contributors: number
          daily_net_profit_egp: number
          daily_revenue_egp: number
          id: string
          new_requests_count: number
          retention_rate_pct: number
          snapshot_date: string
        }
        Insert: {
          avg_customer_acquisition_cost_egp?: number
          avg_lifetime_value_egp?: number
          avg_margin_pct?: number
          created_at?: string
          daily_active_contributors?: number
          daily_net_profit_egp?: number
          daily_revenue_egp?: number
          id?: string
          new_requests_count?: number
          retention_rate_pct?: number
          snapshot_date?: string
        }
        Update: {
          avg_customer_acquisition_cost_egp?: number
          avg_lifetime_value_egp?: number
          avg_margin_pct?: number
          created_at?: string
          daily_active_contributors?: number
          daily_net_profit_egp?: number
          daily_revenue_egp?: number
          id?: string
          new_requests_count?: number
          retention_rate_pct?: number
          snapshot_date?: string
        }
        Relationships: []
      }
      job_queue_rules: {
        Row: {
          created_at: string
          default_priority: number
          id: string
          is_active: boolean
          job_type: string
          team_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_priority?: number
          id?: string
          is_active?: boolean
          job_type: string
          team_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_priority?: number
          id?: string
          is_active?: boolean
          job_type?: string
          team_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      kill_list_items: {
        Row: {
          activated_at: string | null
          activation_reason_ar: string | null
          activation_reason_en: string | null
          created_at: string | null
          execution_plan_ar: string | null
          execution_plan_en: string | null
          id: string
          is_activated: boolean | null
          reason_ar: string
          reason_en: string
          target_phase: string
          title_ar: string
          title_en: string
        }
        Insert: {
          activated_at?: string | null
          activation_reason_ar?: string | null
          activation_reason_en?: string | null
          created_at?: string | null
          execution_plan_ar?: string | null
          execution_plan_en?: string | null
          id?: string
          is_activated?: boolean | null
          reason_ar: string
          reason_en: string
          target_phase: string
          title_ar: string
          title_en: string
        }
        Update: {
          activated_at?: string | null
          activation_reason_ar?: string | null
          activation_reason_en?: string | null
          created_at?: string | null
          execution_plan_ar?: string | null
          execution_plan_en?: string | null
          id?: string
          is_activated?: boolean | null
          reason_ar?: string
          reason_en?: string
          target_phase?: string
          title_ar?: string
          title_en?: string
        }
        Relationships: []
      }
      link_attempt_logs: {
        Row: {
          created_at: string | null
          domain: string | null
          id: string
          ip_address: string | null
          outcome: string
          raw_url: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          id?: string
          ip_address?: string | null
          outcome: string
          raw_url: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          id?: string
          ip_address?: string | null
          outcome?: string
          raw_url?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      market_health_indicators: {
        Row: {
          goal_active_merchants_week: number | null
          goal_avg_deal_value_egp: number | null
          goal_merchant_win_rate_pct: number | null
          goal_quotes_per_request: number | null
          goal_request_conversion_rate_pct: number | null
          goal_response_time_hours: number | null
          id: string
          shortfalls_comments: string | null
          specialization: string
          strength_merchants_comments: string | null
          updated_at: string | null
        }
        Insert: {
          goal_active_merchants_week?: number | null
          goal_avg_deal_value_egp?: number | null
          goal_merchant_win_rate_pct?: number | null
          goal_quotes_per_request?: number | null
          goal_request_conversion_rate_pct?: number | null
          goal_response_time_hours?: number | null
          id?: string
          shortfalls_comments?: string | null
          specialization?: string
          strength_merchants_comments?: string | null
          updated_at?: string | null
        }
        Update: {
          goal_active_merchants_week?: number | null
          goal_avg_deal_value_egp?: number | null
          goal_merchant_win_rate_pct?: number | null
          goal_quotes_per_request?: number | null
          goal_request_conversion_rate_pct?: number | null
          goal_response_time_hours?: number | null
          id?: string
          shortfalls_comments?: string | null
          specialization?: string
          strength_merchants_comments?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      market_insights: {
        Row: {
          category: string
          contributor_id: string
          created_at: string
          discovered_price: number
          id: string
          location_data: Json
          product_name: string
          status: string
          store_name: string
          updated_at: string
        }
        Insert: {
          category: string
          contributor_id: string
          created_at?: string
          discovered_price: number
          id?: string
          location_data?: Json
          product_name: string
          status?: string
          store_name: string
          updated_at?: string
        }
        Update: {
          category?: string
          contributor_id?: string
          created_at?: string
          discovered_price?: number
          id?: string
          location_data?: Json
          product_name?: string
          status?: string
          store_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_insights_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_deals: {
        Row: {
          approved_by_staff_id: string | null
          created_at: string
          deal_price_egp: number
          deal_type: string
          end_time: string | null
          id: string
          is_featured: boolean
          product_id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_by_staff_id?: string | null
          created_at?: string
          deal_price_egp: number
          deal_type?: string
          end_time?: string | null
          id?: string
          is_featured?: boolean
          product_id: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by_staff_id?: string | null
          created_at?: string
          deal_price_egp?: number
          deal_type?: string
          end_time?: string | null
          id?: string
          is_featured?: boolean
          product_id?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_deals_approved_by_staff_id_fkey"
            columns: ["approved_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_deals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          base_price_egp: number
          category: string
          created_at: string
          description_ar: string
          description_en: string
          id: string
          images: string[] | null
          status: string
          stock_quantity: number
          title_ar: string
          title_en: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          base_price_egp: number
          category: string
          created_at?: string
          description_ar: string
          description_en: string
          id?: string
          images?: string[] | null
          status?: string
          stock_quantity?: number
          title_ar: string
          title_en: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          base_price_egp?: number
          category?: string
          created_at?: string
          description_ar?: string
          description_en?: string
          id?: string
          images?: string[] | null
          status?: string
          stock_quantity?: number
          title_ar?: string
          title_en?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_categories: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
        }
        Relationships: []
      }
      merchant_category_map: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_primary: boolean
          merchant_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          merchant_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          merchant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_category_map_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "merchant_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_category_map_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_category_map_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_category_map_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
        ]
      }
      merchant_contacts: {
        Row: {
          contact_label: string | null
          contact_type: string
          contact_value: string
          created_at: string
          id: string
          is_primary: boolean
          merchant_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          contact_label?: string | null
          contact_type: string
          contact_value: string
          created_at?: string
          id?: string
          is_primary?: boolean
          merchant_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          contact_label?: string | null
          contact_type?: string
          contact_value?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          merchant_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_contacts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_contacts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_contacts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
        ]
      }
      merchant_customer_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_verified_purchase: boolean | null
          merchant_id: string
          rating: number | null
          request_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_verified_purchase?: boolean | null
          merchant_id: string
          rating?: number | null
          request_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_verified_purchase?: boolean | null
          merchant_id?: string
          rating?: number | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_customer_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_customer_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      merchant_discovery_studies: {
        Row: {
          accepts_bidding: boolean | null
          accepts_commission: boolean | null
          biggest_selling_challenge: string | null
          conversion_hook: string | null
          created_at: string | null
          estimated_daily_customers: number | null
          id: string
          merchant_id: string
          researcher_id: string | null
          specialization: string | null
          updated_at: string | null
        }
        Insert: {
          accepts_bidding?: boolean | null
          accepts_commission?: boolean | null
          biggest_selling_challenge?: string | null
          conversion_hook?: string | null
          created_at?: string | null
          estimated_daily_customers?: number | null
          id?: string
          merchant_id: string
          researcher_id?: string | null
          specialization?: string | null
          updated_at?: string | null
        }
        Update: {
          accepts_bidding?: boolean | null
          accepts_commission?: boolean | null
          biggest_selling_challenge?: string | null
          conversion_hook?: string | null
          created_at?: string | null
          estimated_daily_customers?: number | null
          id?: string
          merchant_id?: string
          researcher_id?: string | null
          specialization?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_discovery_studies_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_discovery_studies_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_discovery_studies_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_discovery_studies_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_evaluations: {
        Row: {
          actor_staff_id: string | null
          created_at: string
          evaluation_source: string
          id: string
          merchant_id: string
          note: string | null
          overall_score: number | null
          price_competitiveness_score: number | null
          quality_score: number | null
          reliability_score: number | null
          request_id: string | null
          service_score: number | null
        }
        Insert: {
          actor_staff_id?: string | null
          created_at?: string
          evaluation_source?: string
          id?: string
          merchant_id: string
          note?: string | null
          overall_score?: number | null
          price_competitiveness_score?: number | null
          quality_score?: number | null
          reliability_score?: number | null
          request_id?: string | null
          service_score?: number | null
        }
        Update: {
          actor_staff_id?: string | null
          created_at?: string
          evaluation_source?: string
          id?: string
          merchant_id?: string
          note?: string | null
          overall_score?: number | null
          price_competitiveness_score?: number | null
          quality_score?: number | null
          reliability_score?: number | null
          request_id?: string | null
          service_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_evaluations_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_evaluations_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_evaluations_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      merchant_offers_legacy_archive: {
        Row: {
          accepted_at: string | null
          created_at: string
          estimated_days: number | null
          id: string
          merchant_id: string
          notes: string | null
          price_offered_egp: number
          request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          estimated_days?: number | null
          id?: string
          merchant_id: string
          notes?: string | null
          price_offered_egp: number
          request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          estimated_days?: number | null
          id?: string
          merchant_id?: string
          notes?: string | null
          price_offered_egp?: number
          request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_offers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchant_profiles_legacy_archive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "customer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_performance_events: {
        Row: {
          event_type: string
          id: string
          merchant_id: string
          metadata: Json | null
          occurred_at: string | null
          request_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          merchant_id: string
          metadata?: Json | null
          occurred_at?: string | null
          request_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          merchant_id?: string
          metadata?: Json | null
          occurred_at?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_performance_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_performance_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_performance_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      merchant_profiles_legacy_archive: {
        Row: {
          address_details: string | null
          auth_user_id: string | null
          business_category: string
          business_name_ar: string
          business_name_en: string
          created_at: string
          governorate: string | null
          id: string
          national_id: string | null
          phone_number: string
          phone_verified: boolean
          rating_average: number | null
          rating_count: number
          status: string
          total_deals: number
          total_earnings_egp: number
          trust_score: number
          updated_at: string
        }
        Insert: {
          address_details?: string | null
          auth_user_id?: string | null
          business_category: string
          business_name_ar: string
          business_name_en: string
          created_at?: string
          governorate?: string | null
          id?: string
          national_id?: string | null
          phone_number: string
          phone_verified?: boolean
          rating_average?: number | null
          rating_count?: number
          status?: string
          total_deals?: number
          total_earnings_egp?: number
          trust_score?: number
          updated_at?: string
        }
        Update: {
          address_details?: string | null
          auth_user_id?: string | null
          business_category?: string
          business_name_ar?: string
          business_name_en?: string
          created_at?: string
          governorate?: string | null
          id?: string
          national_id?: string | null
          phone_number?: string
          phone_verified?: boolean
          rating_average?: number | null
          rating_count?: number
          status?: string
          total_deals?: number
          total_earnings_egp?: number
          trust_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      merchant_quotes: {
        Row: {
          ai_advantages_ar: string | null
          ai_advantages_en: string | null
          ai_match_score: number | null
          ai_rank: number | null
          ai_rating_stars: number | null
          ai_verdict_ar: string | null
          ai_verdict_en: string | null
          availability_status: string
          contact_notes: string | null
          created_at: string
          currency_code: string
          final_score: number | null
          fit_score: number | null
          id: string
          is_shortlisted: boolean
          merchant_id: string | null
          option_label: string | null
          origin_country: string | null
          price_amount: number | null
          product_brand: string | null
          product_model: string | null
          product_specs_summary: string | null
          product_title: string
          quantity_available: number | null
          quote_valid_until: string | null
          quoted_by_user_id: string | null
          request_id: string
          source_channel: string
          task_id: string | null
          trust_score: number | null
          updated_at: string
          value_score: number | null
          warranty_info: string | null
        }
        Insert: {
          ai_advantages_ar?: string | null
          ai_advantages_en?: string | null
          ai_match_score?: number | null
          ai_rank?: number | null
          ai_rating_stars?: number | null
          ai_verdict_ar?: string | null
          ai_verdict_en?: string | null
          availability_status?: string
          contact_notes?: string | null
          created_at?: string
          currency_code?: string
          final_score?: number | null
          fit_score?: number | null
          id?: string
          is_shortlisted?: boolean
          merchant_id?: string | null
          option_label?: string | null
          origin_country?: string | null
          price_amount?: number | null
          product_brand?: string | null
          product_model?: string | null
          product_specs_summary?: string | null
          product_title: string
          quantity_available?: number | null
          quote_valid_until?: string | null
          quoted_by_user_id?: string | null
          request_id: string
          source_channel?: string
          task_id?: string | null
          trust_score?: number | null
          updated_at?: string
          value_score?: number | null
          warranty_info?: string | null
        }
        Update: {
          ai_advantages_ar?: string | null
          ai_advantages_en?: string | null
          ai_match_score?: number | null
          ai_rank?: number | null
          ai_rating_stars?: number | null
          ai_verdict_ar?: string | null
          ai_verdict_en?: string | null
          availability_status?: string
          contact_notes?: string | null
          created_at?: string
          currency_code?: string
          final_score?: number | null
          fit_score?: number | null
          id?: string
          is_shortlisted?: boolean
          merchant_id?: string | null
          option_label?: string | null
          origin_country?: string | null
          price_amount?: number | null
          product_brand?: string | null
          product_model?: string | null
          product_specs_summary?: string | null
          product_title?: string
          quantity_available?: number | null
          quote_valid_until?: string | null
          quoted_by_user_id?: string | null
          request_id?: string
          source_channel?: string
          task_id?: string | null
          trust_score?: number | null
          updated_at?: string
          value_score?: number | null
          warranty_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_quotes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_quotes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_quotes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "merchant_quotes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "offline_sourcing_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_score_snapshots: {
        Row: {
          calculated_at: string | null
          id: string
          merchant_id: string
          score: number
          snapshot_data: Json
          strengths: string[] | null
          weaknesses: string[] | null
        }
        Insert: {
          calculated_at?: string | null
          id?: string
          merchant_id: string
          score: number
          snapshot_data: Json
          strengths?: string[] | null
          weaknesses?: string[] | null
        }
        Update: {
          calculated_at?: string | null
          id?: string
          merchant_id?: string
          score?: number
          snapshot_data?: Json
          strengths?: string[] | null
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_score_snapshots_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_score_snapshots_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_score_snapshots_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
        ]
      }
      merchant_service_areas: {
        Row: {
          area: string | null
          city: string
          created_at: string
          id: string
          merchant_id: string
          notes: string | null
          supports_products: boolean
          supports_services: boolean
          supports_site_visits: boolean
          updated_at: string
        }
        Insert: {
          area?: string | null
          city: string
          created_at?: string
          id?: string
          merchant_id: string
          notes?: string | null
          supports_products?: boolean
          supports_services?: boolean
          supports_site_visits?: boolean
          updated_at?: string
        }
        Update: {
          area?: string | null
          city?: string
          created_at?: string
          id?: string
          merchant_id?: string
          notes?: string | null
          supports_products?: boolean
          supports_services?: boolean
          supports_site_visits?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_service_areas_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_service_areas_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_service_areas_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
        ]
      }
      merchant_source_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          merchant_id: string
          notes: string | null
          source_label: string | null
          source_type: string
          source_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id: string
          notes?: string | null
          source_label?: string | null
          source_type: string
          source_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id?: string
          notes?: string | null
          source_label?: string | null
          source_type?: string
          source_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_source_links_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_source_links_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_source_links_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
        ]
      }
      merchants: {
        Row: {
          area: string | null
          business_name_ar: string | null
          business_name_en: string | null
          city: string | null
          created_at: string
          default_currency_code: string
          email: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          last_active_at: string | null
          last_contacted_at: string | null
          merchant_code: string
          merchant_type: string
          name: string
          notes: string | null
          overall_score: number | null
          phone_number_primary: string | null
          price_competitiveness_score: number | null
          primary_phone: string | null
          quality_score: number | null
          raw_profile: Json
          reliability_score: number | null
          service_score: number | null
          specialization_summary: string | null
          supports_offline: boolean
          supports_online: boolean
          tags: Json
          telegram_handle: string | null
          updated_at: string
          website_url: string | null
          whatsapp: string | null
        }
        Insert: {
          area?: string | null
          business_name_ar?: string | null
          business_name_en?: string | null
          city?: string | null
          created_at?: string
          default_currency_code?: string
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          last_active_at?: string | null
          last_contacted_at?: string | null
          merchant_code: string
          merchant_type: string
          name: string
          notes?: string | null
          overall_score?: number | null
          phone_number_primary?: string | null
          price_competitiveness_score?: number | null
          primary_phone?: string | null
          quality_score?: number | null
          raw_profile?: Json
          reliability_score?: number | null
          service_score?: number | null
          specialization_summary?: string | null
          supports_offline?: boolean
          supports_online?: boolean
          tags?: Json
          telegram_handle?: string | null
          updated_at?: string
          website_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          area?: string | null
          business_name_ar?: string | null
          business_name_en?: string | null
          city?: string | null
          created_at?: string
          default_currency_code?: string
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          last_active_at?: string | null
          last_contacted_at?: string | null
          merchant_code?: string
          merchant_type?: string
          name?: string
          notes?: string | null
          overall_score?: number | null
          phone_number_primary?: string | null
          price_competitiveness_score?: number | null
          primary_phone?: string | null
          quality_score?: number | null
          raw_profile?: Json
          reliability_score?: number | null
          service_score?: number | null
          specialization_summary?: string | null
          supports_offline?: boolean
          supports_online?: boolean
          tags?: Json
          telegram_handle?: string | null
          updated_at?: string
          website_url?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      moat_competitor_threats: {
        Row: {
          competitor_name: string
          counter_strategy_ar: string
          counter_strategy_en: string
          id: string
          logged_at: string | null
          moat_id: string | null
          severity_level: string | null
          threat_description_ar: string
          threat_description_en: string
        }
        Insert: {
          competitor_name: string
          counter_strategy_ar: string
          counter_strategy_en: string
          id?: string
          logged_at?: string | null
          moat_id?: string | null
          severity_level?: string | null
          threat_description_ar: string
          threat_description_en: string
        }
        Update: {
          competitor_name?: string
          counter_strategy_ar?: string
          counter_strategy_en?: string
          id?: string
          logged_at?: string | null
          moat_id?: string | null
          severity_level?: string | null
          threat_description_ar?: string
          threat_description_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "moat_competitor_threats_moat_id_fkey"
            columns: ["moat_id"]
            isOneToOne: false
            referencedRelation: "platform_moats"
            referencedColumns: ["id"]
          },
        ]
      }
      north_star_config: {
        Row: {
          config_key: string
          id: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          config_key: string
          id?: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          config_key?: string
          id?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: []
      }
      north_star_goals: {
        Row: {
          created_at: string | null
          id: string
          month_number: number
          status: string | null
          target_deals: number
          title_ar: string
          title_en: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          month_number: number
          status?: string | null
          target_deals: number
          title_ar: string
          title_en: string
        }
        Update: {
          created_at?: string | null
          id?: string
          month_number?: number
          status?: string | null
          target_deals?: number
          title_ar?: string
          title_en?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          availability_status: string
          collected_at: string
          collected_by: string
          created_at: string
          currency_code: string
          id: string
          is_recommended: boolean
          merchant_id: string | null
          option_label: string
          price_amount: number
          price_valid_until: string | null
          product_brand: string | null
          product_model: string | null
          product_specs_summary: string | null
          product_title: string
          ranking_position: number | null
          request_id: string
          source_reference_text: string | null
          source_reference_url: string | null
          source_type: string
          trust_score: number | null
          updated_at: string
          value_score: number | null
          warranty_info: string | null
        }
        Insert: {
          availability_status?: string
          collected_at?: string
          collected_by?: string
          created_at?: string
          currency_code?: string
          id?: string
          is_recommended?: boolean
          merchant_id?: string | null
          option_label: string
          price_amount: number
          price_valid_until?: string | null
          product_brand?: string | null
          product_model?: string | null
          product_specs_summary?: string | null
          product_title: string
          ranking_position?: number | null
          request_id: string
          source_reference_text?: string | null
          source_reference_url?: string | null
          source_type: string
          trust_score?: number | null
          updated_at?: string
          value_score?: number | null
          warranty_info?: string | null
        }
        Update: {
          availability_status?: string
          collected_at?: string
          collected_by?: string
          created_at?: string
          currency_code?: string
          id?: string
          is_recommended?: boolean
          merchant_id?: string | null
          option_label?: string
          price_amount?: number
          price_valid_until?: string | null
          product_brand?: string | null
          product_model?: string | null
          product_specs_summary?: string | null
          product_title?: string
          ranking_position?: number | null
          request_id?: string
          source_reference_text?: string | null
          source_reference_url?: string | null
          source_type?: string
          trust_score?: number | null
          updated_at?: string
          value_score?: number | null
          warranty_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "offers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      offline_sourcing_tasks: {
        Row: {
          assigned_to_user_id: string | null
          created_at: string
          due_at: string | null
          findings_summary: string | null
          finished_at: string | null
          id: string
          instructions: string | null
          job_id: string | null
          merchant_id: string | null
          request_id: string
          started_at: string | null
          target_area: string | null
          target_governorate: string | null
          task_status: string
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          created_at?: string
          due_at?: string | null
          findings_summary?: string | null
          finished_at?: string | null
          id?: string
          instructions?: string | null
          job_id?: string | null
          merchant_id?: string | null
          request_id: string
          started_at?: string | null
          target_area?: string | null
          target_governorate?: string | null
          task_status?: string
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          created_at?: string
          due_at?: string | null
          findings_summary?: string | null
          finished_at?: string | null
          id?: string
          instructions?: string | null
          job_id?: string | null
          merchant_id?: string | null
          request_id?: string
          started_at?: string | null
          target_area?: string | null
          target_governorate?: string | null
          task_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_sourcing_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_staff_job_queue"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_staff_my_jobs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      online_merchant_quotes: {
        Row: {
          ai_advantages_ar: string | null
          ai_advantages_en: string | null
          ai_match_score: number | null
          ai_rank: number | null
          ai_rating_stars: number | null
          ai_verdict_ar: string | null
          ai_verdict_en: string | null
          availability_status: string | null
          id: string
          price: number
          product_url: string | null
          raw_response: Json | null
          request_id: string
          scraped_at: string | null
          source_name: string
          store_name: string
          title: string
        }
        Insert: {
          ai_advantages_ar?: string | null
          ai_advantages_en?: string | null
          ai_match_score?: number | null
          ai_rank?: number | null
          ai_rating_stars?: number | null
          ai_verdict_ar?: string | null
          ai_verdict_en?: string | null
          availability_status?: string | null
          id?: string
          price: number
          product_url?: string | null
          raw_response?: Json | null
          request_id: string
          scraped_at?: string | null
          source_name: string
          store_name: string
          title: string
        }
        Update: {
          ai_advantages_ar?: string | null
          ai_advantages_en?: string | null
          ai_match_score?: number | null
          ai_rank?: number | null
          ai_rating_stars?: number | null
          ai_verdict_ar?: string | null
          ai_verdict_en?: string | null
          availability_status?: string | null
          id?: string
          price?: number
          product_url?: string | null
          raw_response?: Json | null
          request_id?: string
          scraped_at?: string | null
          source_name?: string
          store_name?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_merchant_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "customer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_messages: {
        Row: {
          channel: string
          created_at: string | null
          customer_id: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          provider: string | null
          provider_message_id: string | null
          recipient: string
          rendered_body: string
          rendered_subject: string | null
          request_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          template_code: string | null
          updated_at: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          recipient: string
          rendered_body: string
          rendered_subject?: string | null
          request_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_code?: string | null
          updated_at?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          recipient?: string
          rendered_body?: string
          rendered_subject?: string | null
          request_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "outbound_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "outbound_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "outbound_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "outbound_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "outbound_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "outbound_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "outbound_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "outbound_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      page_content: {
        Row: {
          block_id: string
          content_data: Json
          created_at: string
          id: string
          last_edited_by: string | null
          route_path: string
          updated_at: string
        }
        Insert: {
          block_id: string
          content_data?: Json
          created_at?: string
          id?: string
          last_edited_by?: string | null
          route_path: string
          updated_at?: string
        }
        Update: {
          block_id?: string
          content_data?: Json
          created_at?: string
          id?: string
          last_edited_by?: string | null
          route_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_content_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_points_ledger: {
        Row: {
          action_type: string
          created_at: string
          id: string
          partner_id: string
          points: number
          reference_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          partner_id: string
          points: number
          reference_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          partner_id?: string
          points?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_points_ledger_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_audit_events: {
        Row: {
          actor_staff_id: string | null
          actor_type: string
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          notes: string | null
          payment_intent_id: string | null
          request_id: string | null
        }
        Insert: {
          actor_staff_id?: string | null
          actor_type: string
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_intent_id?: string | null
          request_id?: string | null
        }
        Update: {
          actor_staff_id?: string | null
          actor_type?: string
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_intent_id?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_audit_events_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_audit_events_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_audit_events_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          confirmed_at: string | null
          confirmed_by_staff_id: string | null
          created_at: string | null
          created_by_staff_id: string | null
          currency_code: string
          customer_id: string
          expires_at: string | null
          id: string
          intent_type: string
          metadata: Json | null
          payment_instructions: string | null
          provider: string
          provider_reference: string | null
          receipt_image_path: string | null
          request_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          confirmed_by_staff_id?: string | null
          created_at?: string | null
          created_by_staff_id?: string | null
          currency_code?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          intent_type: string
          metadata?: Json | null
          payment_instructions?: string | null
          provider?: string
          provider_reference?: string | null
          receipt_image_path?: string | null
          request_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          confirmed_by_staff_id?: string | null
          created_at?: string | null
          created_by_staff_id?: string | null
          currency_code?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          intent_type?: string
          metadata?: Json | null
          payment_instructions?: string | null
          provider?: string
          provider_reference?: string | null
          receipt_image_path?: string | null
          request_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_confirmed_by_staff_id_fkey"
            columns: ["confirmed_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      payments_legacy_archive: {
        Row: {
          amount: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency_code: string
          customer_id: string
          external_reference: string | null
          id: string
          payment_method: string | null
          payment_status: string
          payment_type: string
          proof_attachment_url: string | null
          request_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency_code?: string
          customer_id: string
          external_reference?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string
          payment_type: string
          proof_attachment_url?: string | null
          request_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency_code?: string
          customer_id?: string
          external_reference?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string
          payment_type?: string
          proof_attachment_url?: string | null
          request_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      phone_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          phone_number: string
          purpose: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          phone_number: string
          purpose: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          phone_number?: string
          purpose?: string
        }
        Relationships: []
      }
      platform_events: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          customer_id: string | null
          event_type: string
          id: string
          merchant_id: string | null
          metadata: Json | null
          occurred_at: string | null
          request_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          customer_id?: string | null
          event_type: string
          id?: string
          merchant_id?: string | null
          metadata?: Json | null
          occurred_at?: string | null
          request_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          customer_id?: string | null
          event_type?: string
          id?: string
          merchant_id?: string | null
          metadata?: Json | null
          occurred_at?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "platform_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "platform_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "platform_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "platform_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "platform_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "platform_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "platform_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "platform_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "platform_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "platform_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      platform_moats: {
        Row: {
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          id: string
          moat_number: number
          moat_type: string
          title_ar: string
          title_en: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          moat_number: number
          moat_type: string
          title_ar: string
          title_en: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          moat_number?: number
          moat_type?: string
          title_ar?: string
          title_en?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_tasks: {
        Row: {
          base_reward_egp: number
          base_reward_points: number
          created_at: string
          created_by_customer_id: string | null
          created_by_staff_id: string | null
          customer_price_egp: number | null
          description_ar: string
          description_en: string
          id: string
          is_recycled: boolean | null
          location_data: Json
          margin_percentage: number | null
          min_level: number
          min_trust_score: number
          parent_request_id: string | null
          platform_profit_egp: number | null
          priority: number
          required_role: string | null
          status: string
          task_type: string
          time_limit_minutes: number
          title_ar: string
          title_en: string
          updated_at: string
        }
        Insert: {
          base_reward_egp?: number
          base_reward_points?: number
          created_at?: string
          created_by_customer_id?: string | null
          created_by_staff_id?: string | null
          customer_price_egp?: number | null
          description_ar: string
          description_en: string
          id?: string
          is_recycled?: boolean | null
          location_data?: Json
          margin_percentage?: number | null
          min_level?: number
          min_trust_score?: number
          parent_request_id?: string | null
          platform_profit_egp?: number | null
          priority?: number
          required_role?: string | null
          status?: string
          task_type: string
          time_limit_minutes?: number
          title_ar: string
          title_en: string
          updated_at?: string
        }
        Update: {
          base_reward_egp?: number
          base_reward_points?: number
          created_at?: string
          created_by_customer_id?: string | null
          created_by_staff_id?: string | null
          customer_price_egp?: number | null
          description_ar?: string
          description_en?: string
          id?: string
          is_recycled?: boolean | null
          location_data?: Json
          margin_percentage?: number | null
          min_level?: number
          min_trust_score?: number
          parent_request_id?: string | null
          platform_profit_egp?: number | null
          priority?: number
          required_role?: string | null
          status?: string
          task_type?: string
          time_limit_minutes?: number
          title_ar?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_tasks_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tasks_parent_request_id_fkey"
            columns: ["parent_request_id"]
            isOneToOne: false
            referencedRelation: "customer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          alert_type: string
          channels: string[]
          created_at: string
          customer_id: string
          id: string
          is_active: boolean
          last_triggered: string | null
          product_id: string
          target_pct: number | null
          target_price: number | null
          triggered_count: number
        }
        Insert: {
          alert_type: string
          channels?: string[]
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean
          last_triggered?: string | null
          product_id: string
          target_pct?: number | null
          target_price?: number | null
          triggered_count?: number
        }
        Update: {
          alert_type?: string
          channels?: string[]
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean
          last_triggered?: string | null
          product_id?: string
          target_pct?: number | null
          target_price?: number | null
          triggered_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_events: {
        Row: {
          absolute_change: number
          created_at: string
          direction: string
          id: string
          new_price: number
          old_price: number
          percentage_change: number
          product_id: string
        }
        Insert: {
          absolute_change: number
          created_at?: string
          direction: string
          id?: string
          new_price: number
          old_price: number
          percentage_change: number
          product_id: string
        }
        Update: {
          absolute_change?: number
          created_at?: string
          direction?: string
          id?: string
          new_price?: number
          old_price?: number
          percentage_change?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_guarantees: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          lower_price: number
          product_name: string
          proof_details: string
          request_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          lower_price: number
          product_name: string
          proof_details: string
          request_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          lower_price?: number
          product_name?: string
          proof_details?: string
          request_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_guarantees_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_guarantees_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_guarantees_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_guarantees_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_guarantees_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_guarantees_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_guarantees_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_guarantees_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_guarantees_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "price_guarantees_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      price_history: {
        Row: {
          captured_at: string
          captured_by: string | null
          currency_code: string
          id: string
          price: number
          product_id: string
          source: string | null
        }
        Insert: {
          captured_at?: string
          captured_by?: string | null
          currency_code?: string
          id?: string
          price: number
          product_id: string
          source?: string | null
        }
        Update: {
          captured_at?: string
          captured_by?: string | null
          currency_code?: string
          id?: string
          price?: number
          product_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_trends: {
        Row: {
          average_price: number | null
          computed_at: string
          highest_price: number | null
          id: string
          lowest_price: number | null
          pct_change_30d: number | null
          pct_change_7d: number | null
          pct_change_90d: number | null
          product_id: string
          trend_30d: string | null
          trend_7d: string | null
          trend_90d: string | null
          trend_score: number | null
        }
        Insert: {
          average_price?: number | null
          computed_at?: string
          highest_price?: number | null
          id?: string
          lowest_price?: number | null
          pct_change_30d?: number | null
          pct_change_7d?: number | null
          pct_change_90d?: number | null
          product_id: string
          trend_30d?: string | null
          trend_7d?: string | null
          trend_90d?: string | null
          trend_score?: number | null
        }
        Update: {
          average_price?: number | null
          computed_at?: string
          highest_price?: number | null
          id?: string
          lowest_price?: number | null
          pct_change_30d?: number | null
          pct_change_7d?: number | null
          pct_change_90d?: number | null
          product_id?: string
          trend_30d?: string | null
          trend_7d?: string | null
          trend_90d?: string | null
          trend_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_trends_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_event_logs: {
        Row: {
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          new_status: string | null
          old_status: string | null
          pricing_version_id: string | null
          service_type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          pricing_version_id?: string | null
          service_type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          pricing_version_id?: string | null
          service_type?: string
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          active_offer_percentage: number | null
          base_price_egp: number
          created_at: string | null
          id: string
          max_price_egp: number
          min_price_egp: number
          override_by_admin: boolean | null
          service_type: string
          updated_at: string | null
          updated_by_staff_id: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          active_offer_percentage?: number | null
          base_price_egp?: number
          created_at?: string | null
          id?: string
          max_price_egp?: number
          min_price_egp?: number
          override_by_admin?: boolean | null
          service_type: string
          updated_at?: string | null
          updated_by_staff_id?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          active_offer_percentage?: number | null
          base_price_egp?: number
          created_at?: string | null
          id?: string
          max_price_egp?: number
          min_price_egp?: number
          override_by_admin?: boolean | null
          service_type?: string
          updated_at?: string | null
          updated_by_staff_id?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_updated_by_staff_id_fkey"
            columns: ["updated_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      product_waitlists: {
        Row: {
          category: string | null
          created_at: string
          customer_id: string
          id: string
          product_name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          customer_id: string
          id?: string
          product_name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          product_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_waitlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "product_waitlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_waitlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "product_waitlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "product_waitlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "product_waitlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "product_waitlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "product_waitlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "product_waitlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: string
          created_at: string
          created_by: string | null
          currency_code: string
          current_price: number | null
          id: string
          image_url: string | null
          is_active: boolean
          popularity_score: number
          research_item_id: string | null
          source: string
          source_url: string | null
          specifications: Json
          subcategory: string | null
          title_ar: string
          title_en: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          brand?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          current_price?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          popularity_score?: number
          research_item_id?: string | null
          source?: string
          source_url?: string | null
          specifications?: Json
          subcategory?: string | null
          title_ar: string
          title_en?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          current_price?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          popularity_score?: number
          research_item_id?: string | null
          source?: string
          source_url?: string | null
          specifications?: Json
          subcategory?: string | null
          title_ar?: string
          title_en?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      project_features: {
        Row: {
          created_at: string | null
          id: string
          name_ar: string
          name_en: string
          notes_ar: string | null
          notes_en: string | null
          phase_number: number
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name_ar: string
          name_en: string
          notes_ar?: string | null
          notes_en?: string | null
          phase_number?: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name_ar?: string
          name_en?: string
          notes_ar?: string | null
          notes_en?: string | null
          phase_number?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_phases: {
        Row: {
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          id: string
          phase_number: number
          progress_override: number | null
          status: string
          tags: string[] | null
          target_customers: number | null
          target_deals: number | null
          target_merchants: number | null
          target_requests: number | null
          tip_ar: string | null
          tip_en: string | null
          title_ar: string
          title_en: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          phase_number: number
          progress_override?: number | null
          status?: string
          tags?: string[] | null
          target_customers?: number | null
          target_deals?: number | null
          target_merchants?: number | null
          target_requests?: number | null
          tip_ar?: string | null
          tip_en?: string | null
          title_ar: string
          title_en: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          phase_number?: number
          progress_override?: number | null
          status?: string
          tags?: string[] | null
          target_customers?: number | null
          target_deals?: number | null
          target_merchants?: number | null
          target_requests?: number | null
          tip_ar?: string | null
          tip_en?: string | null
          title_ar?: string
          title_en?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limit_logs: {
        Row: {
          endpoint: string
          id: string
          ip_address: string
          request_timestamp: string
        }
        Insert: {
          endpoint: string
          id?: string
          ip_address: string
          request_timestamp?: string
        }
        Update: {
          endpoint?: string
          id?: string
          ip_address?: string
          request_timestamp?: string
        }
        Relationships: []
      }
      referral_challenges: {
        Row: {
          completed_at: string | null
          contributor_id: string
          created_at: string
          current_active_count: number
          id: string
          is_active: boolean
          reward_cash_egp: number | null
          reward_multiplier: number | null
          target_count: number
        }
        Insert: {
          completed_at?: string | null
          contributor_id: string
          created_at?: string
          current_active_count?: number
          id?: string
          is_active?: boolean
          reward_cash_egp?: number | null
          reward_multiplier?: number | null
          target_count: number
        }
        Update: {
          completed_at?: string | null
          contributor_id?: string
          created_at?: string
          current_active_count?: number
          id?: string
          is_active?: boolean
          reward_cash_egp?: number | null
          reward_multiplier?: number | null
          target_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_challenges_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_logs: {
        Row: {
          created_at: string
          id: string
          referred_email: string
          referrer_id: string
          referrer_type: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_email: string
          referrer_id: string
          referrer_type: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_email?: string
          referrer_id?: string
          referrer_type?: string
          status?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          cash_awarded_egp: number
          contributor_id: string
          created_at: string
          id: string
          points_awarded: number
          reward_stage: string
          source_user_id: string
        }
        Insert: {
          cash_awarded_egp?: number
          contributor_id: string
          created_at?: string
          id?: string
          points_awarded?: number
          reward_stage: string
          source_user_id: string
        }
        Update: {
          cash_awarded_egp?: number
          contributor_id?: string
          created_at?: string
          id?: string
          points_awarded?: number
          reward_stage?: string
          source_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      report_option_snapshots: {
        Row: {
          availability_status: string | null
          candidate_channel: string
          created_at: string
          currency_code: string
          customer_summary: string | null
          disadvantages_ar: string | null
          disadvantages_en: string | null
          display_brand: string | null
          display_model: string | null
          display_price_amount: number | null
          display_rank: number
          display_specs_summary: string | null
          display_title: string
          final_score: number | null
          hidden_contact_notes: string | null
          hidden_merchant_location: string | null
          hidden_merchant_name: string | null
          hidden_reference_url: string | null
          highlight_summary: string | null
          id: string
          offer_id: string | null
          report_id: string
          request_id: string
          reveal_kind: string
          reveal_locked: boolean
          shortlist_id: string | null
          trust_score: number | null
          updated_at: string
          value_score: number | null
          warranty_info: string | null
        }
        Insert: {
          availability_status?: string | null
          candidate_channel: string
          created_at?: string
          currency_code?: string
          customer_summary?: string | null
          disadvantages_ar?: string | null
          disadvantages_en?: string | null
          display_brand?: string | null
          display_model?: string | null
          display_price_amount?: number | null
          display_rank: number
          display_specs_summary?: string | null
          display_title: string
          final_score?: number | null
          hidden_contact_notes?: string | null
          hidden_merchant_location?: string | null
          hidden_merchant_name?: string | null
          hidden_reference_url?: string | null
          highlight_summary?: string | null
          id?: string
          offer_id?: string | null
          report_id: string
          request_id: string
          reveal_kind?: string
          reveal_locked?: boolean
          shortlist_id?: string | null
          trust_score?: number | null
          updated_at?: string
          value_score?: number | null
          warranty_info?: string | null
        }
        Update: {
          availability_status?: string | null
          candidate_channel?: string
          created_at?: string
          currency_code?: string
          customer_summary?: string | null
          disadvantages_ar?: string | null
          disadvantages_en?: string | null
          display_brand?: string | null
          display_model?: string | null
          display_price_amount?: number | null
          display_rank?: number
          display_specs_summary?: string | null
          display_title?: string
          final_score?: number | null
          hidden_contact_notes?: string | null
          hidden_merchant_location?: string | null
          hidden_merchant_name?: string | null
          hidden_reference_url?: string | null
          highlight_summary?: string | null
          id?: string
          offer_id?: string | null
          report_id?: string
          request_id?: string
          reveal_kind?: string
          reveal_locked?: boolean
          shortlist_id?: string | null
          trust_score?: number | null
          updated_at?: string
          value_score?: number | null
          warranty_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_option_snapshots_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_option_snapshots_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "v_request_offers_comparison"
            referencedColumns: ["offer_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_option_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_snapshots_shortlist_id_fkey"
            columns: ["shortlist_id"]
            isOneToOne: false
            referencedRelation: "request_candidate_shortlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_option_snapshots_shortlist_id_fkey"
            columns: ["shortlist_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_detailed"
            referencedColumns: ["shortlist_id"]
          },
        ]
      }
      report_option_unlocks: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          report_option_snapshot_id: string
          request_id: string
          subscription_id: string | null
          unlock_type: string
          unlocked_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          report_option_snapshot_id: string
          request_id: string
          subscription_id?: string | null
          unlock_type?: string
          unlocked_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          report_option_snapshot_id?: string
          request_id?: string
          subscription_id?: string | null
          unlock_type?: string
          unlocked_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_option_unlocks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_option_unlocks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "report_option_unlocks_snapshot_id_fkey"
            columns: ["report_option_snapshot_id"]
            isOneToOne: false
            referencedRelation: "report_option_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_option_unlocks_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          approved_at: string | null
          created_at: string
          executive_summary: string | null
          generated_by: string
          id: string
          pdf_file_url: string | null
          price_validity_note: string | null
          recommendation_summary: string | null
          report_status: string
          report_version: number
          request_id: string
          updated_at: string | null
          why_not_cheapest: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          executive_summary?: string | null
          generated_by?: string
          id?: string
          pdf_file_url?: string | null
          price_validity_note?: string | null
          recommendation_summary?: string | null
          report_status?: string
          report_version?: number
          request_id: string
          updated_at?: string | null
          why_not_cheapest?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          executive_summary?: string | null
          generated_by?: string
          id?: string
          pdf_file_url?: string | null
          price_validity_note?: string | null
          recommendation_summary?: string | null
          report_status?: string
          report_version?: number
          request_id?: string
          updated_at?: string | null
          why_not_cheapest?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      request_admin_actions: {
        Row: {
          action_reason: string | null
          action_type: string
          actor_staff_id: string | null
          after_status: string | null
          before_status: string | null
          created_at: string
          id: string
          payload: Json
          request_id: string
        }
        Insert: {
          action_reason?: string | null
          action_type: string
          actor_staff_id?: string | null
          after_status?: string | null
          before_status?: string | null
          created_at?: string
          id?: string
          payload?: Json
          request_id: string
        }
        Update: {
          action_reason?: string | null
          action_type?: string
          actor_staff_id?: string | null
          after_status?: string | null
          before_status?: string | null
          created_at?: string
          id?: string
          payload?: Json
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_admin_actions_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_admin_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      request_attachments: {
        Row: {
          attachment_type: string
          created_at: string
          external_link: string | null
          file_name: string | null
          file_url: string | null
          id: string
          mime_type: string | null
          request_id: string
          uploaded_by_type: string
        }
        Insert: {
          attachment_type: string
          created_at?: string
          external_link?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          request_id: string
          uploaded_by_type?: string
        }
        Update: {
          attachment_type?: string
          created_at?: string
          external_link?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          request_id?: string
          uploaded_by_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      request_candidate_shortlists: {
        Row: {
          candidate_channel: string
          created_at: string
          customer_summary: string | null
          final_score: number | null
          fit_score: number | null
          id: string
          is_active: boolean
          is_recommended: boolean
          merchant_quote_id: string | null
          option_label: string | null
          published_offer_id: string | null
          ranking_position: number
          reason_summary: string
          request_id: string
          research_item_id: string | null
          reveal_locked: boolean
          selected_by_user_id: string | null
          trust_score: number | null
          updated_at: string
          value_score: number | null
        }
        Insert: {
          candidate_channel: string
          created_at?: string
          customer_summary?: string | null
          final_score?: number | null
          fit_score?: number | null
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          merchant_quote_id?: string | null
          option_label?: string | null
          published_offer_id?: string | null
          ranking_position: number
          reason_summary: string
          request_id: string
          research_item_id?: string | null
          reveal_locked?: boolean
          selected_by_user_id?: string | null
          trust_score?: number | null
          updated_at?: string
          value_score?: number | null
        }
        Update: {
          candidate_channel?: string
          created_at?: string
          customer_summary?: string | null
          final_score?: number | null
          fit_score?: number | null
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          merchant_quote_id?: string | null
          option_label?: string | null
          published_offer_id?: string | null
          ranking_position?: number
          reason_summary?: string
          request_id?: string
          research_item_id?: string | null
          reveal_locked?: boolean
          selected_by_user_id?: string | null
          trust_score?: number | null
          updated_at?: string
          value_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "request_candidate_shortlists_merchant_quote_id_fkey"
            columns: ["merchant_quote_id"]
            isOneToOne: false
            referencedRelation: "merchant_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_merchant_quote_id_fkey"
            columns: ["merchant_quote_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_detailed"
            referencedColumns: ["merchant_quote_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_published_offer_id_fkey"
            columns: ["published_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_published_offer_id_fkey"
            columns: ["published_offer_id"]
            isOneToOne: false
            referencedRelation: "v_request_offers_comparison"
            referencedColumns: ["offer_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_research_item_id_fkey"
            columns: ["research_item_id"]
            isOneToOne: false
            referencedRelation: "research_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_research_item_id_fkey"
            columns: ["research_item_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_detailed"
            referencedColumns: ["research_item_id"]
          },
        ]
      }
      request_compliance_actions: {
        Row: {
          action_source: string
          actor_staff_id: string | null
          applied_decision: string | null
          created_at: string
          decision_reason: string | null
          id: string
          metadata: Json
          recommended_decision: string
          request_id: string
          summary_text: string | null
        }
        Insert: {
          action_source?: string
          actor_staff_id?: string | null
          applied_decision?: string | null
          created_at?: string
          decision_reason?: string | null
          id?: string
          metadata?: Json
          recommended_decision: string
          request_id: string
          summary_text?: string | null
        }
        Update: {
          action_source?: string
          actor_staff_id?: string | null
          applied_decision?: string | null
          created_at?: string
          decision_reason?: string | null
          id?: string
          metadata?: Json
          recommended_decision?: string
          request_id?: string
          summary_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_compliance_actions_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      request_compliance_hits: {
        Row: {
          actor_staff_id: string | null
          confidence_score: number | null
          created_at: string
          id: string
          language_code: string
          match_source: string
          matched_excerpt: string | null
          matched_keyword: string | null
          metadata: Json
          notes: string | null
          request_id: string
          rule_id: string
        }
        Insert: {
          actor_staff_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          language_code?: string
          match_source?: string
          matched_excerpt?: string | null
          matched_keyword?: string | null
          metadata?: Json
          notes?: string | null
          request_id: string
          rule_id: string
        }
        Update: {
          actor_staff_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          language_code?: string
          match_source?: string
          matched_excerpt?: string | null
          matched_keyword?: string | null
          metadata?: Json
          notes?: string | null
          request_id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_compliance_hits_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_compliance_hits_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      request_customer_message_audit: {
        Row: {
          body_text: string | null
          created_at: string
          created_by_staff_id: string | null
          delivery_channel: string
          delivery_status: string
          id: string
          language_code: string
          message_type: string
          report_id: string | null
          request_id: string
          subject_text: string | null
          updated_at: string
        }
        Insert: {
          body_text?: string | null
          created_at?: string
          created_by_staff_id?: string | null
          delivery_channel?: string
          delivery_status?: string
          id?: string
          language_code: string
          message_type: string
          report_id?: string | null
          request_id: string
          subject_text?: string | null
          updated_at?: string
        }
        Update: {
          body_text?: string | null
          created_at?: string
          created_by_staff_id?: string | null
          delivery_channel?: string
          delivery_status?: string
          id?: string
          language_code?: string
          message_type?: string
          report_id?: string | null
          request_id?: string
          subject_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_customer_message_audit_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_customer_message_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      request_delete_backups: {
        Row: {
          backup_json: Json
          created_at: string
          created_by_staff_id: string
          delete_confirmed: boolean
          delete_confirmed_at: string | null
          delete_notes: string | null
          deleted_at: string | null
          deleted_by_staff_id: string | null
          id: string
          request_code: string
          request_id: string
        }
        Insert: {
          backup_json: Json
          created_at?: string
          created_by_staff_id: string
          delete_confirmed?: boolean
          delete_confirmed_at?: string | null
          delete_notes?: string | null
          deleted_at?: string | null
          deleted_by_staff_id?: string | null
          id?: string
          request_code: string
          request_id: string
        }
        Update: {
          backup_json?: Json
          created_at?: string
          created_by_staff_id?: string
          delete_confirmed?: boolean
          delete_confirmed_at?: string | null
          delete_notes?: string | null
          deleted_at?: string | null
          deleted_by_staff_id?: string | null
          id?: string
          request_code?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_delete_backups_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_delete_backups_deleted_by_staff_id_fkey"
            columns: ["deleted_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      request_deletion_audit: {
        Row: {
          actor_staff_id: string | null
          backup_id: string | null
          created_at: string
          event_type: string
          id: string
          notes: string | null
          request_id: string | null
        }
        Insert: {
          actor_staff_id?: string | null
          backup_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          notes?: string | null
          request_id?: string | null
        }
        Update: {
          actor_staff_id?: string | null
          backup_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_deletion_audit_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_deletion_audit_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "request_delete_backups"
            referencedColumns: ["id"]
          },
        ]
      }
      request_disputes: {
        Row: {
          created_at: string
          customer_id: string
          details: string
          dispute_reason: string
          id: string
          request_id: string
          resolution_notes: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          details: string
          dispute_reason: string
          id?: string
          request_id: string
          resolution_notes?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          details?: string
          dispute_reason?: string
          id?: string
          request_id?: string
          resolution_notes?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_disputes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "request_disputes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_disputes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "request_disputes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "request_disputes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "request_disputes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "request_disputes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "request_disputes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "request_disputes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_disputes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      request_merchant_matches: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          match_score: number | null
          match_status: string
          merchant_id: string
          note: string | null
          quote_amount: number | null
          request_id: string
          source_channel: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          id?: string
          match_score?: number | null
          match_status?: string
          merchant_id: string
          note?: string | null
          quote_amount?: number | null
          request_id: string
          source_channel: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          match_score?: number | null
          match_status?: string
          merchant_id?: string
          note?: string | null
          quote_amount?: number | null
          request_id?: string
          source_channel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_merchant_matches_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_merchant_matches_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      request_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          request_id: string
          sender_id: string | null
          sender_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          request_id: string
          sender_id?: string | null
          sender_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          request_id?: string
          sender_id?: string | null
          sender_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      request_operational_states: {
        Row: {
          approved_for_processing: boolean
          client_released_at: string | null
          created_at: string
          id: string
          latest_note: string | null
          needs_manual_review: boolean
          operational_stage: string
          report_ready: boolean
          request_id: string
          stage_status: string
          updated_at: string
        }
        Insert: {
          approved_for_processing?: boolean
          client_released_at?: string | null
          created_at?: string
          id?: string
          latest_note?: string | null
          needs_manual_review?: boolean
          operational_stage?: string
          report_ready?: boolean
          request_id: string
          stage_status?: string
          updated_at?: string
        }
        Update: {
          approved_for_processing?: boolean
          client_released_at?: string | null
          created_at?: string
          id?: string
          latest_note?: string | null
          needs_manual_review?: boolean
          operational_stage?: string
          report_ready?: boolean
          request_id?: string
          stage_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_operational_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      request_preferences: {
        Row: {
          allow_alternatives: boolean
          budget_max: number | null
          budget_min: number | null
          condition_preference: string
          created_at: string
          delivery_needed: boolean
          estimated_market_price: number | null
          id: string
          knows_market_price: boolean
          notes: string | null
          preferred_area: string | null
          preferred_brands: string | null
          preferred_governorate: string | null
          preferred_models: string | null
          preferred_specs: string | null
          priority_focus: string
          request_id: string
          search_scope: string
          updated_at: string
          urgency_level: string
        }
        Insert: {
          allow_alternatives?: boolean
          budget_max?: number | null
          budget_min?: number | null
          condition_preference?: string
          created_at?: string
          delivery_needed?: boolean
          estimated_market_price?: number | null
          id?: string
          knows_market_price?: boolean
          notes?: string | null
          preferred_area?: string | null
          preferred_brands?: string | null
          preferred_governorate?: string | null
          preferred_models?: string | null
          preferred_specs?: string | null
          priority_focus?: string
          request_id: string
          search_scope?: string
          updated_at?: string
          urgency_level?: string
        }
        Update: {
          allow_alternatives?: boolean
          budget_max?: number | null
          budget_min?: number | null
          condition_preference?: string
          created_at?: string
          delivery_needed?: boolean
          estimated_market_price?: number | null
          id?: string
          knows_market_price?: boolean
          notes?: string | null
          preferred_area?: string | null
          preferred_brands?: string | null
          preferred_governorate?: string | null
          preferred_models?: string | null
          preferred_specs?: string | null
          priority_focus?: string
          request_id?: string
          search_scope?: string
          updated_at?: string
          urgency_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      request_qualification_reviews: {
        Row: {
          clarity_score: number | null
          created_at: string
          decision_recommendation: string
          fulfillment_feasibility_score: number | null
          id: string
          internal_notes: string | null
          is_latest: boolean
          overall_score: number | null
          profit_potential_score: number | null
          reason_summary: string
          reputation_value_score: number | null
          request_id: string
          review_source: string
          reviewed_by_user_id: string | null
          seriousness_score: number | null
          updated_at: string
        }
        Insert: {
          clarity_score?: number | null
          created_at?: string
          decision_recommendation: string
          fulfillment_feasibility_score?: number | null
          id?: string
          internal_notes?: string | null
          is_latest?: boolean
          overall_score?: number | null
          profit_potential_score?: number | null
          reason_summary: string
          reputation_value_score?: number | null
          request_id: string
          review_source?: string
          reviewed_by_user_id?: string | null
          seriousness_score?: number | null
          updated_at?: string
        }
        Update: {
          clarity_score?: number | null
          created_at?: string
          decision_recommendation?: string
          fulfillment_feasibility_score?: number | null
          id?: string
          internal_notes?: string | null
          is_latest?: boolean
          overall_score?: number | null
          profit_potential_score?: number | null
          reason_summary?: string
          reputation_value_score?: number | null
          request_id?: string
          review_source?: string
          reviewed_by_user_id?: string | null
          seriousness_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      request_status_history: {
        Row: {
          change_reason: string | null
          changed_by_staff_id: string | null
          created_at: string
          event_source: string | null
          from_canonical_state: string | null
          from_status: string | null
          id: string
          metadata: Json | null
          request_id: string
          to_canonical_state: string | null
          to_status: string
          transition_name: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_by_staff_id?: string | null
          created_at?: string
          event_source?: string | null
          from_canonical_state?: string | null
          from_status?: string | null
          id?: string
          metadata?: Json | null
          request_id: string
          to_canonical_state?: string | null
          to_status: string
          transition_name?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_by_staff_id?: string | null
          created_at?: string
          event_source?: string | null
          from_canonical_state?: string | null
          from_status?: string | null
          id?: string
          metadata?: Json | null
          request_id?: string
          to_canonical_state?: string | null
          to_status?: string
          transition_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_status_history_changed_by_staff_id_fkey"
            columns: ["changed_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      request_workflow_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          note: string | null
          request_id: string
          stage_after: string | null
          stage_before: string | null
          status_after: string | null
          status_before: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          note?: string | null
          request_id: string
          stage_after?: string | null
          stage_before?: string | null
          status_after?: string | null
          status_before?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          note?: string | null
          request_id?: string
          stage_after?: string | null
          stage_before?: string | null
          status_after?: string | null
          status_before?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      requests: {
        Row: {
          accepted_at: string | null
          accepts_used: boolean | null
          ai_confidence: number | null
          archive_reason: string | null
          archived_at: string | null
          archived_by_staff_id: string | null
          archived_by_user_id: string | null
          assigned_reviewer_staff_id: string | null
          auction_duration_hours: number | null
          auction_ends_at: string | null
          budget: number | null
          business_metadata: Json | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_staff_id: string | null
          canonical_state: string | null
          city: string | null
          clarification_requested_at: string | null
          created_at: string
          current_status: string
          customer_id: string
          execution_requested: boolean
          followup_requested: boolean
          id: string
          intake_ai_confidence: number | null
          intake_ai_decision: string | null
          intake_clarification_questions: Json
          intake_internal_reasoning: string | null
          intake_mode: string
          intake_reason_code: string | null
          intake_reviewer_note: string | null
          intake_summary: string | null
          interpreted_summary: string | null
          is_archived: boolean
          is_business: boolean | null
          is_cancelled: boolean
          is_recurring: boolean | null
          is_soft_deleted: boolean
          last_reordered_at: string | null
          metadata: Json | null
          operations_entered_at: string | null
          payment_policy: string | null
          pricing_decision: string
          pricing_model: string | null
          pricing_notes: string | null
          priority: string | null
          raw_description: string
          ready_entered_at: string | null
          reference_image_path: string | null
          rejected_at: string | null
          reorder_interval_months: number | null
          reporting_entered_at: string | null
          request_code: string
          request_kind: string | null
          reviewer_assigned_at: string | null
          reviewer_assigned_by_staff_id: string | null
          reviewer_assignment_status: string
          reviewer_decided_at: string | null
          reviewer_decided_by_staff_id: string | null
          reviewer_decision: string | null
          reviewer_notes: string | null
          rfq_document: string | null
          selected_bid_id: string | null
          service_fee_amount: number | null
          site_visit_requested: boolean
          soft_delete_reason: string | null
          soft_deleted_at: string | null
          soft_deleted_by_staff_id: string | null
          source_channel: string
          source_type: string | null
          title: string | null
          turnaround_deadline: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepts_used?: boolean | null
          ai_confidence?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by_staff_id?: string | null
          archived_by_user_id?: string | null
          assigned_reviewer_staff_id?: string | null
          auction_duration_hours?: number | null
          auction_ends_at?: string | null
          budget?: number | null
          business_metadata?: Json | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_staff_id?: string | null
          canonical_state?: string | null
          city?: string | null
          clarification_requested_at?: string | null
          created_at?: string
          current_status?: string
          customer_id: string
          execution_requested?: boolean
          followup_requested?: boolean
          id?: string
          intake_ai_confidence?: number | null
          intake_ai_decision?: string | null
          intake_clarification_questions?: Json
          intake_internal_reasoning?: string | null
          intake_mode?: string
          intake_reason_code?: string | null
          intake_reviewer_note?: string | null
          intake_summary?: string | null
          interpreted_summary?: string | null
          is_archived?: boolean
          is_business?: boolean | null
          is_cancelled?: boolean
          is_recurring?: boolean | null
          is_soft_deleted?: boolean
          last_reordered_at?: string | null
          metadata?: Json | null
          operations_entered_at?: string | null
          payment_policy?: string | null
          pricing_decision?: string
          pricing_model?: string | null
          pricing_notes?: string | null
          priority?: string | null
          raw_description: string
          ready_entered_at?: string | null
          reference_image_path?: string | null
          rejected_at?: string | null
          reorder_interval_months?: number | null
          reporting_entered_at?: string | null
          request_code: string
          request_kind?: string | null
          reviewer_assigned_at?: string | null
          reviewer_assigned_by_staff_id?: string | null
          reviewer_assignment_status?: string
          reviewer_decided_at?: string | null
          reviewer_decided_by_staff_id?: string | null
          reviewer_decision?: string | null
          reviewer_notes?: string | null
          rfq_document?: string | null
          selected_bid_id?: string | null
          service_fee_amount?: number | null
          site_visit_requested?: boolean
          soft_delete_reason?: string | null
          soft_deleted_at?: string | null
          soft_deleted_by_staff_id?: string | null
          source_channel?: string
          source_type?: string | null
          title?: string | null
          turnaround_deadline?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepts_used?: boolean | null
          ai_confidence?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by_staff_id?: string | null
          archived_by_user_id?: string | null
          assigned_reviewer_staff_id?: string | null
          auction_duration_hours?: number | null
          auction_ends_at?: string | null
          budget?: number | null
          business_metadata?: Json | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_staff_id?: string | null
          canonical_state?: string | null
          city?: string | null
          clarification_requested_at?: string | null
          created_at?: string
          current_status?: string
          customer_id?: string
          execution_requested?: boolean
          followup_requested?: boolean
          id?: string
          intake_ai_confidence?: number | null
          intake_ai_decision?: string | null
          intake_clarification_questions?: Json
          intake_internal_reasoning?: string | null
          intake_mode?: string
          intake_reason_code?: string | null
          intake_reviewer_note?: string | null
          intake_summary?: string | null
          interpreted_summary?: string | null
          is_archived?: boolean
          is_business?: boolean | null
          is_cancelled?: boolean
          is_recurring?: boolean | null
          is_soft_deleted?: boolean
          last_reordered_at?: string | null
          metadata?: Json | null
          operations_entered_at?: string | null
          payment_policy?: string | null
          pricing_decision?: string
          pricing_model?: string | null
          pricing_notes?: string | null
          priority?: string | null
          raw_description?: string
          ready_entered_at?: string | null
          reference_image_path?: string | null
          rejected_at?: string | null
          reorder_interval_months?: number | null
          reporting_entered_at?: string | null
          request_code?: string
          request_kind?: string | null
          reviewer_assigned_at?: string | null
          reviewer_assigned_by_staff_id?: string | null
          reviewer_assignment_status?: string
          reviewer_decided_at?: string | null
          reviewer_decided_by_staff_id?: string | null
          reviewer_decision?: string | null
          reviewer_notes?: string | null
          rfq_document?: string | null
          selected_bid_id?: string | null
          service_fee_amount?: number | null
          site_visit_requested?: boolean
          soft_delete_reason?: string | null
          soft_deleted_at?: string | null
          soft_deleted_by_staff_id?: string | null
          source_channel?: string
          source_type?: string | null
          title?: string | null
          turnaround_deadline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_requests_assigned_reviewer"
            columns: ["assigned_reviewer_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_requests_reviewer_assigned_by"
            columns: ["reviewer_assigned_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_archived_by_staff_id_fkey"
            columns: ["archived_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_cancelled_by_staff_id_fkey"
            columns: ["cancelled_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_reviewer_decided_by_staff_id_fkey"
            columns: ["reviewer_decided_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_selected_bid_id_fkey"
            columns: ["selected_bid_id"]
            isOneToOne: false
            referencedRelation: "vendor_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_soft_deleted_by_staff_id_fkey"
            columns: ["soft_deleted_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      research_items: {
        Row: {
          availability_status: string
          created_at: string
          currency_code: string
          final_score: number | null
          fit_score: number | null
          id: string
          is_candidate: boolean
          is_shortlisted: boolean
          listing_url: string | null
          option_label: string | null
          price_amount: number | null
          price_change_note: string | null
          price_last_checked_at: string | null
          product_brand: string | null
          product_model: string | null
          product_specs_summary: string | null
          product_title: string
          raw_payload: Json
          request_id: string
          research_run_id: string
          seller_location: string | null
          seller_name: string | null
          source_name: string
          source_type: string
          trust_score: number | null
          updated_at: string
          value_score: number | null
          warranty_info: string | null
        }
        Insert: {
          availability_status?: string
          created_at?: string
          currency_code?: string
          final_score?: number | null
          fit_score?: number | null
          id?: string
          is_candidate?: boolean
          is_shortlisted?: boolean
          listing_url?: string | null
          option_label?: string | null
          price_amount?: number | null
          price_change_note?: string | null
          price_last_checked_at?: string | null
          product_brand?: string | null
          product_model?: string | null
          product_specs_summary?: string | null
          product_title: string
          raw_payload?: Json
          request_id: string
          research_run_id: string
          seller_location?: string | null
          seller_name?: string | null
          source_name: string
          source_type?: string
          trust_score?: number | null
          updated_at?: string
          value_score?: number | null
          warranty_info?: string | null
        }
        Update: {
          availability_status?: string
          created_at?: string
          currency_code?: string
          final_score?: number | null
          fit_score?: number | null
          id?: string
          is_candidate?: boolean
          is_shortlisted?: boolean
          listing_url?: string | null
          option_label?: string | null
          price_amount?: number | null
          price_change_note?: string | null
          price_last_checked_at?: string | null
          product_brand?: string | null
          product_model?: string | null
          product_specs_summary?: string | null
          product_title?: string
          raw_payload?: Json
          request_id?: string
          research_run_id?: string
          seller_location?: string | null
          seller_name?: string | null
          source_name?: string
          source_type?: string
          trust_score?: number | null
          updated_at?: string
          value_score?: number | null
          warranty_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_items_research_run_id_fkey"
            columns: ["research_run_id"]
            isOneToOne: false
            referencedRelation: "research_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      research_runs: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          job_id: string | null
          query_text: string | null
          request_id: string
          results_count: number
          run_kind: string
          search_scope: string
          started_at: string | null
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          job_id?: string | null
          query_text?: string | null
          request_id: string
          results_count?: number
          run_kind?: string
          search_scope?: string
          started_at?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          job_id?: string | null
          query_text?: string | null
          request_id?: string
          results_count?: number
          run_kind?: string
          search_scope?: string
          started_at?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_staff_job_queue"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "research_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_staff_my_jobs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          service_key: string
          title_ar: string
          title_en: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          service_key: string
          title_ar: string
          title_en: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          service_key?: string
          title_ar?: string
          title_en?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_pricing_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          created_by_staff_id: string | null
          currency: string | null
          currency_code: string | null
          current_price: number
          deleted_at: string | null
          ends_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          original_price: number | null
          promo_label_ar: string | null
          promo_label_en: string | null
          promo_price: number | null
          service_key: string | null
          service_type: string | null
          starts_at: string | null
          status: string | null
          updated_at: string | null
          version_no: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          created_by_staff_id?: string | null
          currency?: string | null
          currency_code?: string | null
          current_price: number
          deleted_at?: string | null
          ends_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          original_price?: number | null
          promo_label_ar?: string | null
          promo_label_en?: string | null
          promo_price?: number | null
          service_key?: string | null
          service_type?: string | null
          starts_at?: string | null
          status?: string | null
          updated_at?: string | null
          version_no: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          created_by_staff_id?: string | null
          currency?: string | null
          currency_code?: string | null
          current_price?: number
          deleted_at?: string | null
          ends_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          original_price?: number | null
          promo_label_ar?: string | null
          promo_label_en?: string | null
          promo_price?: number | null
          service_key?: string | null
          service_type?: string | null
          starts_at?: string | null
          status?: string | null
          updated_at?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_pricing_versions_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_pricing_versions_service_key_fkey"
            columns: ["service_key"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["service_key"]
          },
        ]
      }
      site_content_audit: {
        Row: {
          block_key: string
          change_reason: string | null
          changed_by_staff_id: string | null
          created_at: string | null
          id: string
          new_snapshot: Json | null
          old_snapshot: Json | null
        }
        Insert: {
          block_key: string
          change_reason?: string | null
          changed_by_staff_id?: string | null
          created_at?: string | null
          id?: string
          new_snapshot?: Json | null
          old_snapshot?: Json | null
        }
        Update: {
          block_key?: string
          change_reason?: string | null
          changed_by_staff_id?: string | null
          created_at?: string | null
          id?: string
          new_snapshot?: Json | null
          old_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "site_content_audit_changed_by_staff_id_fkey"
            columns: ["changed_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content_blocks: {
        Row: {
          block_key: string
          body_ar: string | null
          body_en: string | null
          content_json: Json | null
          created_at: string | null
          cta_href: string | null
          cta_label_ar: string | null
          cta_label_en: string | null
          display_order: number | null
          id: string
          image_path: string | null
          is_published: boolean | null
          page_key: string
          section_key: string
          title_ar: string | null
          title_en: string | null
          updated_at: string | null
          updated_by_staff_id: string | null
        }
        Insert: {
          block_key: string
          body_ar?: string | null
          body_en?: string | null
          content_json?: Json | null
          created_at?: string | null
          cta_href?: string | null
          cta_label_ar?: string | null
          cta_label_en?: string | null
          display_order?: number | null
          id?: string
          image_path?: string | null
          is_published?: boolean | null
          page_key: string
          section_key: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string | null
          updated_by_staff_id?: string | null
        }
        Update: {
          block_key?: string
          body_ar?: string | null
          body_en?: string | null
          content_json?: Json | null
          created_at?: string | null
          cta_href?: string | null
          cta_label_ar?: string | null
          cta_label_en?: string | null
          display_order?: number | null
          id?: string
          image_path?: string | null
          is_published?: boolean | null
          page_key?: string
          section_key?: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string | null
          updated_by_staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_content_blocks_updated_by_staff_id_fkey"
            columns: ["updated_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      source_reveals: {
        Row: {
          created_at: string
          id: string
          payment_id: string | null
          payment_intent_id: string | null
          report_id: string
          request_id: string
          reveal_type: string
          revealed_at: string
          revealed_by: string
          revealed_contact_info: string | null
          revealed_source_text: string | null
          revealed_source_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id?: string | null
          payment_intent_id?: string | null
          report_id: string
          request_id: string
          reveal_type: string
          revealed_at?: string
          revealed_by?: string
          revealed_contact_info?: string | null
          revealed_source_text?: string | null
          revealed_source_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string | null
          payment_intent_id?: string | null
          report_id?: string
          request_id?: string
          reveal_type?: string
          revealed_at?: string
          revealed_by?: string
          revealed_contact_info?: string | null
          revealed_source_text?: string | null
          revealed_source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_reveals_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_reveals_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_reveals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_reveals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "source_reveals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "source_reveals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "source_reveals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "source_reveals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "source_reveals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["latest_report_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "source_reveals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      sourcing_sources: {
        Row: {
          api_key: string | null
          config_settings: Json | null
          created_at: string | null
          display_name_ar: string
          display_name_en: string
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          config_settings?: Json | null
          created_at?: string | null
          display_name_ar: string
          display_name_en: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          config_settings?: Json | null
          created_at?: string | null
          display_name_ar?: string
          display_name_en?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      specializations: {
        Row: {
          created_at: string
          criteria_json: Json
          description_ar: string | null
          description_en: string | null
          display_order: number
          id: string
          is_active: boolean
          is_beachhead: boolean
          name_ar: string
          name_en: string
          parent_id: string | null
          priority_stars: number
          slug: string
          target_deals: number
          target_merchants: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          criteria_json?: Json
          description_ar?: string | null
          description_en?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_beachhead?: boolean
          name_ar: string
          name_en: string
          parent_id?: string | null
          priority_stars?: number
          slug: string
          target_deals?: number
          target_merchants?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          criteria_json?: Json
          description_ar?: string | null
          description_en?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_beachhead?: boolean
          name_ar?: string
          name_en?: string
          parent_id?: string | null
          priority_stars?: number
          slug?: string
          target_deals?: number
          target_merchants?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "specializations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "specializations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_action_steps: {
        Row: {
          created_at: string | null
          id: string
          is_completed_manual: boolean | null
          metric_type: string
          step_number: number
          subtitle_ar: string | null
          subtitle_en: string | null
          target_count: number | null
          title_ar: string
          title_en: string
          updated_at: string | null
          xp_reward: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_completed_manual?: boolean | null
          metric_type?: string
          step_number: number
          subtitle_ar?: string | null
          subtitle_en?: string | null
          target_count?: number | null
          title_ar: string
          title_en: string
          updated_at?: string | null
          xp_reward?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_completed_manual?: boolean | null
          metric_type?: string
          step_number?: number
          subtitle_ar?: string | null
          subtitle_en?: string | null
          target_count?: number | null
          title_ar?: string
          title_en?: string
          updated_at?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      staff_departments: {
        Row: {
          alert_message_ar: string | null
          alert_message_en: string | null
          challenges_ar: string | null
          challenges_en: string | null
          created_at: string | null
          id: string
          manager_id: string | null
          name_ar: string
          name_en: string
          strengths_ar: string | null
          strengths_en: string | null
          updated_at: string | null
          weaknesses_ar: string | null
          weaknesses_en: string | null
        }
        Insert: {
          alert_message_ar?: string | null
          alert_message_en?: string | null
          challenges_ar?: string | null
          challenges_en?: string | null
          created_at?: string | null
          id?: string
          manager_id?: string | null
          name_ar: string
          name_en: string
          strengths_ar?: string | null
          strengths_en?: string | null
          updated_at?: string | null
          weaknesses_ar?: string | null
          weaknesses_en?: string | null
        }
        Update: {
          alert_message_ar?: string | null
          alert_message_en?: string | null
          challenges_ar?: string | null
          challenges_en?: string | null
          created_at?: string | null
          id?: string
          manager_id?: string | null
          name_ar?: string
          name_en?: string
          strengths_ar?: string | null
          strengths_en?: string | null
          updated_at?: string | null
          weaknesses_ar?: string | null
          weaknesses_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_hr_details: {
        Row: {
          base_salary: number | null
          commission_pct: number | null
          department_id: string | null
          email: string | null
          performance_rating: number | null
          phone: string | null
          primary_role: string | null
          review_notes: string | null
          secondary_roles: string[] | null
          staff_id: string
          updated_at: string | null
        }
        Insert: {
          base_salary?: number | null
          commission_pct?: number | null
          department_id?: string | null
          email?: string | null
          performance_rating?: number | null
          phone?: string | null
          primary_role?: string | null
          review_notes?: string | null
          secondary_roles?: string[] | null
          staff_id: string
          updated_at?: string | null
        }
        Update: {
          base_salary?: number | null
          commission_pct?: number | null
          department_id?: string | null
          email?: string | null
          performance_rating?: number | null
          phone?: string | null
          primary_role?: string | null
          review_notes?: string | null
          secondary_roles?: string[] | null
          staff_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_hr_details_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "staff_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_hr_details_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_member_roles: {
        Row: {
          granted_at: string
          granted_by_staff_id: string | null
          id: string
          is_active: boolean
          role_code: string
          staff_member_id: string
        }
        Insert: {
          granted_at?: string
          granted_by_staff_id?: string | null
          id?: string
          is_active?: boolean
          role_code: string
          staff_member_id: string
        }
        Update: {
          granted_at?: string
          granted_by_staff_id?: string | null
          id?: string
          is_active?: boolean
          role_code?: string
          staff_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_member_roles_granted_by_staff_id_fkey"
            columns: ["granted_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_member_roles_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          archived_at: string | null
          auth_user_id: string
          can_approve_requests: boolean
          can_manage_merchants: boolean
          can_view_financials: boolean
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          is_archived: boolean | null
          staff_role: string
          team_code: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          auth_user_id: string
          can_approve_requests?: boolean
          can_manage_merchants?: boolean
          can_view_financials?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean | null
          staff_role: string
          team_code?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          auth_user_id?: string
          can_approve_requests?: boolean
          can_manage_merchants?: boolean
          can_view_financials?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean | null
          staff_role?: string
          team_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_performance_reviews: {
        Row: {
          achievements: string | null
          created_at: string | null
          id: string
          improvement_plan: string | null
          is_manager_review: boolean | null
          review_period: string
          reviewer_id: string | null
          score_communication: number | null
          score_execution: number | null
          score_leadership: number | null
          score_quality: number | null
          staff_id: string
          weaknesses: string | null
        }
        Insert: {
          achievements?: string | null
          created_at?: string | null
          id?: string
          improvement_plan?: string | null
          is_manager_review?: boolean | null
          review_period: string
          reviewer_id?: string | null
          score_communication?: number | null
          score_execution?: number | null
          score_leadership?: number | null
          score_quality?: number | null
          staff_id: string
          weaknesses?: string | null
        }
        Update: {
          achievements?: string | null
          created_at?: string | null
          id?: string
          improvement_plan?: string | null
          is_manager_review?: boolean | null
          review_period?: string
          reviewer_id?: string | null
          score_communication?: number | null
          score_execution?: number | null
          score_leadership?: number | null
          score_quality?: number | null
          staff_id?: string
          weaknesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_performance_reviews_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          allow_concierge: boolean
          allow_offline: boolean
          allow_online: boolean
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          max_visible_options: number
          monthly_request_limit: number | null
          monthly_reveal_limit: number | null
          plan_code: string
          updated_at: string
        }
        Insert: {
          allow_concierge?: boolean
          allow_offline?: boolean
          allow_online?: boolean
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          max_visible_options?: number
          monthly_request_limit?: number | null
          monthly_reveal_limit?: number | null
          plan_code: string
          updated_at?: string
        }
        Update: {
          allow_concierge?: boolean
          allow_offline?: boolean
          allow_online?: boolean
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          max_visible_options?: number
          monthly_request_limit?: number | null
          monthly_reveal_limit?: number | null
          plan_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_claims: {
        Row: {
          claimed_at: string
          contributor_id: string
          expires_at: string
          id: string
          reviewed_at: string | null
          reviewed_by_staff_id: string | null
          staff_notes: string | null
          status: string
          submission_data: Json | null
          submitted_at: string | null
          task_id: string
        }
        Insert: {
          claimed_at?: string
          contributor_id: string
          expires_at: string
          id?: string
          reviewed_at?: string | null
          reviewed_by_staff_id?: string | null
          staff_notes?: string | null
          status?: string
          submission_data?: Json | null
          submitted_at?: string | null
          task_id: string
        }
        Update: {
          claimed_at?: string
          contributor_id?: string
          expires_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by_staff_id?: string | null
          staff_notes?: string | null
          status?: string
          submission_data?: Json | null
          submitted_at?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_claims_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_claims_reviewed_by_staff_id_fkey"
            columns: ["reviewed_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_claims_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "platform_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          created_at: string
          customer_id: string
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          quantity: number
          request_id: string | null
          subscription_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          event_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          quantity?: number
          request_id?: string | null
          subscription_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          quantity?: number
          request_id?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "usage_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_watchlists: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_watchlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_watchlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_watchlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_watchlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_watchlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_watchlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_watchlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_watchlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_watchlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_watchlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_audit_log: {
        Row: {
          actor_id: string | null
          created_at: string
          event_name: string
          id: string
          new_value: Json | null
          old_value: Json | null
          vendor_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_name: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          vendor_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_name?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_audit_log_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_automation_logs: {
        Row: {
          created_at: string
          direction: string | null
          error_msg: string | null
          id: string
          message_type: string | null
          payload: Json | null
          status: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          direction?: string | null
          error_msg?: string | null
          id?: string
          message_type?: string | null
          payload?: Json | null
          status?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          direction?: string | null
          error_msg?: string | null
          id?: string
          message_type?: string | null
          payload?: Json | null
          status?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_automation_logs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_bids: {
        Row: {
          after_sales_service: string | null
          created_at: string
          currency_code: string
          deal_score: number
          delivery_days: number
          freebies: string | null
          id: string
          installation_included: boolean
          is_active: boolean
          price_amount: number
          product_condition: string
          request_id: string
          updated_at: string
          vendor_id: string
          warranty_months: number
        }
        Insert: {
          after_sales_service?: string | null
          created_at?: string
          currency_code?: string
          deal_score?: number
          delivery_days: number
          freebies?: string | null
          id?: string
          installation_included?: boolean
          is_active?: boolean
          price_amount: number
          product_condition?: string
          request_id: string
          updated_at?: string
          vendor_id: string
          warranty_months?: number
        }
        Update: {
          after_sales_service?: string | null
          created_at?: string
          currency_code?: string
          deal_score?: number
          delivery_days?: number
          freebies?: string | null
          id?: string
          installation_included?: boolean
          is_active?: boolean
          price_amount?: number
          product_condition?: string
          request_id?: string
          updated_at?: string
          vendor_id?: string
          warranty_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "vendor_bids_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_categories: {
        Row: {
          category: string
          specialization_id: string | null
          vendor_id: string
        }
        Insert: {
          category: string
          specialization_id?: string | null
          vendor_id: string
        }
        Update: {
          category?: string
          specialization_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_categories_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "specializations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_categories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_fee_phases: {
        Row: {
          commission_rate: number | null
          created_at: string
          id: string
          is_current_phase: boolean
          min_fee_egp: number | null
          phase_name: string
          phase_order: number
          subscription_monthly_egp: number | null
          updated_at: string
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string
          id?: string
          is_current_phase?: boolean
          min_fee_egp?: number | null
          phase_name: string
          phase_order: number
          subscription_monthly_egp?: number | null
          updated_at?: string
        }
        Update: {
          commission_rate?: number | null
          created_at?: string
          id?: string
          is_current_phase?: boolean
          min_fee_egp?: number | null
          phase_name?: string
          phase_order?: number
          subscription_monthly_egp?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      vendor_portal_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          portal_email: string | null
          token: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          portal_email?: string | null
          token?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          portal_email?: string | null
          token?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_portal_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_portal_tokens_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_profile_details: {
        Row: {
          address: string | null
          business_name_ar: string
          business_name_en: string | null
          category: string
          city: string | null
          created_at: string
          email: string | null
          id: string
          merchant_type: string
          secondary_phone: string | null
          updated_at: string
          vendor_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_name_ar: string
          business_name_en?: string | null
          category: string
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          merchant_type: string
          secondary_phone?: string | null
          updated_at?: string
          vendor_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_name_ar?: string
          business_name_en?: string | null
          category?: string
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          merchant_type?: string
          secondary_phone?: string | null
          updated_at?: string
          vendor_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_profile_details_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_reviews: {
        Row: {
          commitment_rating: number | null
          created_at: string
          customer_id: string | null
          id: string
          image_url: string | null
          is_archived: boolean
          is_published: boolean
          is_verified_purchase: boolean | null
          platform_comment: string | null
          platform_rating: number | null
          price_rating: number | null
          quality_rating: number | null
          recommend: boolean | null
          request_id: string | null
          response_rating: number | null
          review_tags: string[] | null
          review_token: string | null
          token_expires_at: string | null
          vendor_availability: number | null
          vendor_communication: number | null
          vendor_id: string
          vendor_price_accuracy: number | null
          vendor_rating: number | null
          video_url: string | null
        }
        Insert: {
          commitment_rating?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          image_url?: string | null
          is_archived?: boolean
          is_published?: boolean
          is_verified_purchase?: boolean | null
          platform_comment?: string | null
          platform_rating?: number | null
          price_rating?: number | null
          quality_rating?: number | null
          recommend?: boolean | null
          request_id?: string | null
          response_rating?: number | null
          review_tags?: string[] | null
          review_token?: string | null
          token_expires_at?: string | null
          vendor_availability?: number | null
          vendor_communication?: number | null
          vendor_id: string
          vendor_price_accuracy?: number | null
          vendor_rating?: number | null
          video_url?: string | null
        }
        Update: {
          commitment_rating?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          image_url?: string | null
          is_archived?: boolean
          is_published?: boolean
          is_verified_purchase?: boolean | null
          platform_comment?: string | null
          platform_rating?: number | null
          price_rating?: number | null
          quality_rating?: number | null
          recommend?: boolean | null
          request_id?: string | null
          response_rating?: number | null
          review_tags?: string[] | null
          review_token?: string | null
          token_expires_at?: string | null
          vendor_availability?: number | null
          vendor_communication?: number | null
          vendor_id?: string
          vendor_price_accuracy?: number | null
          vendor_rating?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_system_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sent_by: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sent_by?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sent_by?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_system_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_system_messages_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          account_tier: string
          area: string | null
          auth_user_id: string | null
          bid_win_rate: number | null
          commercial_reg_number: string | null
          created_at: string
          customer_satisfaction_rate: number | null
          display_name: string
          governorate: string | null
          id: string
          is_phone_verified: boolean
          merchant_access_level: string
          notes: string | null
          portal_email: string | null
          portal_enabled: boolean
          price_reliability_rate: number | null
          reported_issues: number
          response_speed_hours: number | null
          system_status: string
          tax_card_number: string | null
          total_successful_deals: number
          trust_score: number
          trusted_score: number | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          account_tier?: string
          area?: string | null
          auth_user_id?: string | null
          bid_win_rate?: number | null
          commercial_reg_number?: string | null
          created_at?: string
          customer_satisfaction_rate?: number | null
          display_name: string
          governorate?: string | null
          id?: string
          is_phone_verified?: boolean
          merchant_access_level?: string
          notes?: string | null
          portal_email?: string | null
          portal_enabled?: boolean
          price_reliability_rate?: number | null
          reported_issues?: number
          response_speed_hours?: number | null
          system_status?: string
          tax_card_number?: string | null
          total_successful_deals?: number
          trust_score?: number
          trusted_score?: number | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          account_tier?: string
          area?: string | null
          auth_user_id?: string | null
          bid_win_rate?: number | null
          commercial_reg_number?: string | null
          created_at?: string
          customer_satisfaction_rate?: number | null
          display_name?: string
          governorate?: string | null
          id?: string
          is_phone_verified?: boolean
          merchant_access_level?: string
          notes?: string | null
          portal_email?: string | null
          portal_enabled?: boolean
          price_reliability_rate?: number | null
          reported_issues?: number
          response_speed_hours?: number | null
          system_status?: string
          tax_card_number?: string | null
          total_successful_deals?: number
          trust_score?: number
          trusted_score?: number | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      vision_future_ideas: {
        Row: {
          created_at: string | null
          description_ar: string
          description_en: string
          icon: string | null
          id: string
          target_phase: string
          title_ar: string
          title_en: string
        }
        Insert: {
          created_at?: string | null
          description_ar: string
          description_en: string
          icon?: string | null
          id?: string
          target_phase: string
          title_ar: string
          title_en: string
        }
        Update: {
          created_at?: string | null
          description_ar?: string
          description_en?: string
          icon?: string | null
          id?: string
          target_phase?: string
          title_ar?: string
          title_en?: string
        }
        Relationships: []
      }
      vision_pillars: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          subtitle_ar: string
          subtitle_en: string
          title_ar: string
          title_en: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          subtitle_ar: string
          subtitle_en: string
          title_ar: string
          title_en: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          subtitle_ar?: string
          subtitle_en?: string
          title_ar?: string
          title_en?: string
        }
        Relationships: []
      }
      vision_timeline: {
        Row: {
          created_at: string | null
          description_ar: string
          description_en: string
          id: string
          milestone_year: string
          title_ar: string
          title_en: string
        }
        Insert: {
          created_at?: string | null
          description_ar: string
          description_en: string
          id?: string
          milestone_year: string
          title_ar: string
          title_en: string
        }
        Update: {
          created_at?: string | null
          description_ar?: string
          description_en?: string
          id?: string
          milestone_year?: string
          title_ar?: string
          title_en?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_egp: number
          amount_points: number
          contributor_id: string
          created_at: string
          currency: string | null
          description_ar: string | null
          description_en: string | null
          device_fingerprint: string | null
          fraud_audit_id: string | null
          id: string
          idempotency_key: string | null
          ip_address: string | null
          metadata: Json
          reference_id: string | null
          reference_type: string | null
          status: string
          tx_type: string
          wallet_id: string
        }
        Insert: {
          amount_egp: number
          amount_points?: number
          contributor_id: string
          created_at?: string
          currency?: string | null
          description_ar?: string | null
          description_en?: string | null
          device_fingerprint?: string | null
          fraud_audit_id?: string | null
          id?: string
          idempotency_key?: string | null
          ip_address?: string | null
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          tx_type: string
          wallet_id: string
        }
        Update: {
          amount_egp?: number
          amount_points?: number
          contributor_id?: string
          created_at?: string
          currency?: string | null
          description_ar?: string | null
          description_en?: string | null
          device_fingerprint?: string | null
          fraud_audit_id?: string | null
          id?: string
          idempotency_key?: string | null
          ip_address?: string | null
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          tx_type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_fraud_audit_id_fkey"
            columns: ["fraud_audit_id"]
            isOneToOne: false
            referencedRelation: "fraud_audit_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "contributor_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          ai_summary_status: string
          attempts: number
          created_at: string
          dispatch_status: string
          email_status: string
          id: string
          last_error: string | null
          request_id: string
          updated_at: string
        }
        Insert: {
          ai_summary_status?: string
          attempts?: number
          created_at?: string
          dispatch_status?: string
          email_status?: string
          id?: string
          last_error?: string | null
          request_id: string
          updated_at?: string
        }
        Update: {
          ai_summary_status?: string
          attempts?: number
          created_at?: string
          dispatch_status?: string
          email_status?: string
          id?: string
          last_error?: string | null
          request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "workflow_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
    }
    Views: {
      customer_reliability_stats: {
        Row: {
          completed_requests: number | null
          customer_id: string | null
          purchase_rate: number | null
          reliability_score: number | null
          response_rate: number | null
          total_requests: number | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          amount_egp: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          currency_code: string | null
          customer_id: string | null
          external_reference: string | null
          id: string | null
          payment_method: string | null
          payment_status: string | null
          payment_type: string | null
          request_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          amount_egp?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          currency_code?: string | null
          customer_id?: string | null
          external_reference?: string | null
          id?: string | null
          payment_method?: string | null
          payment_status?: never
          payment_type?: string | null
          request_id?: string | null
          status?: never
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          amount_egp?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          currency_code?: string | null
          customer_id?: string | null
          external_reference?: string | null
          id?: string | null
          payment_method?: string | null
          payment_status?: never
          payment_type?: string | null
          request_id?: string | null
          status?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_confirmed_by_staff_id_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "payment_intents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      v_customer_current_cycle_usage: {
        Row: {
          customer_id: string | null
          last_usage_at: string | null
          reports_generated: number | null
          requests_used: number | null
          reveals_used: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "usage_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      v_customer_request_portal_overview: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          client_released_at: string | null
          condition_preference: string | null
          current_status: string | null
          customer_auth_user_id: string | null
          customer_id: string | null
          customer_name: string | null
          customer_reveal_completion_pct: number | null
          customer_visible_status: string | null
          delivery_needed: boolean | null
          latest_report_created_at: string | null
          latest_report_id: string | null
          latest_report_status: string | null
          notes: string | null
          operational_stage: string | null
          pipeline_completion_pct: number | null
          preferred_area: string | null
          preferred_brands: string | null
          preferred_governorate: string | null
          preferred_language: string | null
          preferred_models: string | null
          preferred_specs: string | null
          priority_focus: string | null
          raw_description: string | null
          reports_count: number | null
          request_code: string | null
          request_created_at: string | null
          request_id: string | null
          request_updated_at: string | null
          requested_search_scope: string | null
          search_scope: string | null
          snapshot_count: number | null
          source_channel: string | null
          stage_status: string | null
          title: string | null
          unlock_count: number | null
        }
        Relationships: []
      }
      v_guest_request_tracking_overview: {
        Row: {
          client_released_at: string | null
          current_status: string | null
          customer_id: string | null
          customer_name: string | null
          customer_reveal_completion_pct: number | null
          customer_visible_status: string | null
          latest_report_created_at: string | null
          latest_report_id: string | null
          latest_report_status: string | null
          operational_stage: string | null
          pipeline_completion_pct: number | null
          preferred_language: string | null
          raw_description: string | null
          reports_count: number | null
          request_code: string | null
          request_created_at: string | null
          request_id: string | null
          request_updated_at: string | null
          search_scope: string | null
          snapshot_count: number | null
          source_channel: string | null
          stage_status: string | null
          title: string | null
          unlock_count: number | null
        }
        Relationships: []
      }
      v_intake_request_queue: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          current_status: string | null
          customer_code: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          delivery_needed: boolean | null
          execution_requested: boolean | null
          followup_requested: boolean | null
          has_reference_image: boolean | null
          intake_ai_confidence: number | null
          intake_ai_decision: string | null
          intake_mode: string | null
          intake_reason_code: string | null
          intake_stage: string | null
          intake_summary: string | null
          phone_number_normalized: string | null
          phone_number_raw: string | null
          preferred_area: string | null
          preferred_governorate: string | null
          pricing_decision: string | null
          priority_focus: string | null
          raw_description: string | null
          reference_image_path: string | null
          request_code: string | null
          request_created_at: string | null
          request_id: string | null
          request_kind: string | null
          request_updated_at: string | null
          reviewer_decided_at: string | null
          reviewer_decision: string | null
          search_scope: string | null
          service_fee_amount: number | null
          site_visit_requested: boolean | null
          source_channel: string | null
          title: string | null
          urgency_level: string | null
        }
        Relationships: []
      }
      v_intake_request_workspace: {
        Row: {
          allow_alternatives: boolean | null
          budget_max: number | null
          budget_min: number | null
          condition_preference: string | null
          current_status: string | null
          customer_code: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          delivery_needed: boolean | null
          estimated_market_price: number | null
          execution_requested: boolean | null
          followup_requested: boolean | null
          intake_ai_confidence: number | null
          intake_ai_decision: string | null
          intake_clarification_questions: Json | null
          intake_internal_reasoning: string | null
          intake_mode: string | null
          intake_reason_code: string | null
          intake_reviewer_note: string | null
          intake_stage: string | null
          intake_summary: string | null
          knows_market_price: boolean | null
          phone_number_normalized: string | null
          phone_number_raw: string | null
          preference_created_at: string | null
          preference_id: string | null
          preference_notes: string | null
          preference_updated_at: string | null
          preferred_area: string | null
          preferred_brands: string | null
          preferred_governorate: string | null
          preferred_models: string | null
          preferred_specs: string | null
          pricing_decision: string | null
          pricing_notes: string | null
          priority_focus: string | null
          raw_description: string | null
          reference_image_path: string | null
          request_code: string | null
          request_created_at: string | null
          request_id: string | null
          request_kind: string | null
          request_updated_at: string | null
          reviewer_decided_at: string | null
          reviewer_decided_by_staff_id: string | null
          reviewer_decision: string | null
          reviewer_notes: string | null
          search_scope: string | null
          service_fee_amount: number | null
          site_visit_requested: boolean | null
          source_channel: string | null
          title: string | null
          urgency_level: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_reviewer_decided_by_staff_id_fkey"
            columns: ["reviewer_decided_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      v_merchant_directory: {
        Row: {
          area: string | null
          category_names_ar: string | null
          category_names_en: string | null
          city: string | null
          email: string | null
          is_active: boolean | null
          last_active_at: string | null
          last_contacted_at: string | null
          merchant_code: string | null
          merchant_id: string | null
          merchant_type: string | null
          name: string | null
          overall_score: number | null
          price_competitiveness_score: number | null
          primary_phone: string | null
          quality_score: number | null
          reliability_score: number | null
          service_score: number | null
          supports_offline: boolean | null
          supports_online: boolean | null
          website_url: string | null
          whatsapp: string | null
        }
        Relationships: []
      }
      v_merchant_profile_summary: {
        Row: {
          active_source_links_count: number | null
          area: string | null
          avg_overall_score: number | null
          avg_price_score: number | null
          avg_quality_score: number | null
          avg_reliability_score: number | null
          avg_service_score: number | null
          categories_count: number | null
          city: string | null
          contact_rows_count: number | null
          created_at: string | null
          default_currency_code: string | null
          effective_overall_score: number | null
          effective_reliability_score: number | null
          email: string | null
          evaluations_count: number | null
          facebook_url: string | null
          has_email_contact: boolean | null
          has_phone_contact: boolean | null
          has_whatsapp_contact: boolean | null
          instagram_url: string | null
          is_active: boolean | null
          latest_activity_at: string | null
          matched_requests_count: number | null
          matches_count: number | null
          merchant_code: string | null
          merchant_id: string | null
          merchant_type: string | null
          name: string | null
          notes: string | null
          offer_requests_count: number | null
          offers_count: number | null
          primary_categories_count: number | null
          primary_email_contact: string | null
          primary_phone: string | null
          primary_phone_contact: string | null
          primary_whatsapp_contact: string | null
          product_service_areas_count: number | null
          quotes_count: number | null
          service_areas_count: number | null
          service_service_areas_count: number | null
          shortlisted_quotes_count: number | null
          source_links_count: number | null
          specialization_summary: string | null
          stored_overall_score: number | null
          stored_reliability_score: number | null
          supports_offline: boolean | null
          supports_online: boolean | null
          telegram_handle: string | null
          updated_at: string | null
          visit_service_areas_count: number | null
          website_url: string | null
          whatsapp: string | null
        }
        Relationships: []
      }
      v_queue_performance_metrics: {
        Row: {
          avg_stage_age_hours: number | null
          current_stage_code: string | null
          request_count: number | null
          sla_status: string | null
        }
        Relationships: []
      }
      v_request_admin_board: {
        Row: {
          active_shortlist_count: number | null
          allow_alternatives: boolean | null
          approved_for_processing: boolean | null
          budget_max: number | null
          budget_min: number | null
          client_released_at: string | null
          completed_jobs: number | null
          customer_code: string | null
          customer_id: string | null
          customer_name: string | null
          failed_jobs: number | null
          governorate: string | null
          latest_note: string | null
          latest_qualification_decision: string | null
          latest_qualification_reason: string | null
          latest_qualification_score: number | null
          latest_report_created_at: string | null
          latest_report_id: string | null
          latest_report_status: string | null
          legacy_current_status: string | null
          needs_manual_review: boolean | null
          offers_count: number | null
          offline_quotes_count: number | null
          offline_shortlisted_quotes: number | null
          offline_tasks_count: number | null
          operational_stage: string | null
          payments_count: number | null
          preferred_area: string | null
          preferred_contact_method: string | null
          preferred_governorate: string | null
          preferred_language: string | null
          primary_contact: string | null
          priority_focus: string | null
          published_shortlist_count: number | null
          queued_jobs: number | null
          report_ready: boolean | null
          reports_count: number | null
          request_code: string | null
          request_created_at: string | null
          request_id: string | null
          request_updated_at: string | null
          research_items_count: number | null
          research_runs_count: number | null
          research_shortlisted_items: number | null
          running_jobs: number | null
          search_scope: string | null
          snapshot_count: number | null
          source_channel: string | null
          stage_status: string | null
          title: string | null
          total_jobs: number | null
          unlock_count: number | null
          waiting_approval_jobs: number | null
        }
        Relationships: []
      }
      v_request_candidate_pool: {
        Row: {
          availability_status: string | null
          candidate_channel: string | null
          candidate_id: string | null
          created_at: string | null
          currency_code: string | null
          final_score: number | null
          fit_score: number | null
          is_shortlisted: boolean | null
          merchant_id: string | null
          merchant_name: string | null
          option_label: string | null
          price_amount: number | null
          product_brand: string | null
          product_model: string | null
          product_specs_summary: string | null
          product_title: string | null
          reference_url: string | null
          request_id: string | null
          source_name: string | null
          source_type: string | null
          trust_score: number | null
          value_score: number | null
          warranty_info: string | null
        }
        Relationships: []
      }
      v_request_compliance_overview: {
        Row: {
          blocked_hits: number | null
          current_status: string | null
          customer_id: string | null
          latest_action_at: string | null
          latest_action_source: string | null
          latest_actor_staff_id: string | null
          latest_applied_decision: string | null
          latest_decision_reason: string | null
          latest_hit_at: string | null
          latest_recommended_decision: string | null
          latest_summary_text: string | null
          manual_review_hits: number | null
          matched_rule_codes: string[] | null
          request_code: string | null
          request_created_at: string | null
          request_id: string | null
          request_updated_at: string | null
          title: string | null
          total_hits: number | null
          warning_hits: number | null
        }
        Relationships: [
          {
            foreignKeyName: "request_compliance_actions_actor_staff_id_fkey"
            columns: ["latest_actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      v_request_delivery_overview: {
        Row: {
          current_status: string | null
          latest_report_approved_at: string | null
          latest_report_status: string | null
          latest_report_version: number | null
          latest_unlock_at: string | null
          reports_count: number | null
          request_code: string | null
          request_id: string | null
          snapshots_count: number | null
          title: string | null
          unlocks_count: number | null
        }
        Relationships: []
      }
      v_request_job_summary: {
        Row: {
          completed_jobs: number | null
          failed_jobs: number | null
          last_job_created_at: string | null
          last_job_finished_at: string | null
          queued_jobs: number | null
          request_id: string | null
          running_jobs: number | null
          total_jobs: number | null
          waiting_approval_jobs: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      v_request_latest_qualification: {
        Row: {
          clarity_score: number | null
          created_at: string | null
          decision_recommendation: string | null
          fulfillment_feasibility_score: number | null
          internal_notes: string | null
          is_latest: boolean | null
          overall_score: number | null
          profit_potential_score: number | null
          qualification_review_id: string | null
          reason_summary: string | null
          reputation_value_score: number | null
          request_id: string | null
          review_source: string | null
          reviewed_by_user_id: string | null
          seriousness_score: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_qualification_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      v_request_merchant_match_overview: {
        Row: {
          created_at: string | null
          currency_code: string | null
          id: string | null
          match_score: number | null
          match_status: string | null
          merchant_area: string | null
          merchant_city: string | null
          merchant_id: string | null
          merchant_name: string | null
          merchant_type: string | null
          note: string | null
          quote_amount: number | null
          request_code: string | null
          request_id: string | null
          request_title: string | null
          source_channel: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_merchant_matches_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_merchant_matches_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_merchant_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      v_request_offers_comparison: {
        Row: {
          area: string | null
          availability_status: string | null
          city: string | null
          currency_code: string | null
          is_recommended: boolean | null
          merchant_name: string | null
          merchant_type: string | null
          offer_id: string | null
          option_label: string | null
          price_amount: number | null
          product_brand: string | null
          product_model: string | null
          product_specs_summary: string | null
          product_title: string | null
          ranking_position: number | null
          request_code: string | null
          source_type: string | null
          trust_score: number | null
          value_score: number | null
          warranty_info: string | null
        }
        Relationships: []
      }
      v_request_offline_summary: {
        Row: {
          last_task_created_at: string | null
          last_task_finished_at: string | null
          request_id: string | null
          shortlisted_quotes: number | null
          total_quotes: number | null
          total_tasks: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "offline_sourcing_tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      v_request_overview: {
        Row: {
          current_status: string | null
          customer_code: string | null
          customer_id: string | null
          customer_name: string | null
          governorate: string | null
          offers_count: number | null
          payments_count: number | null
          preferred_contact_method: string | null
          preferred_language: string | null
          primary_contact: string | null
          reports_count: number | null
          request_code: string | null
          request_created_at: string | null
          request_id: string | null
          request_updated_at: string | null
          source_channel: string | null
          title: string | null
        }
        Relationships: []
      }
      v_request_pipeline_progress: {
        Row: {
          active_shortlist_count: number | null
          completed_jobs: number | null
          customer_name: string | null
          failed_jobs: number | null
          latest_qualification_decision: string | null
          latest_qualification_score: number | null
          operational_stage: string | null
          pipeline_completion_pct: number | null
          queued_jobs: number | null
          request_code: string | null
          request_created_at: string | null
          request_id: string | null
          request_updated_at: string | null
          running_jobs: number | null
          snapshot_count: number | null
          stage_status: string | null
          total_jobs: number | null
          waiting_approval_jobs: number | null
        }
        Relationships: []
      }
      v_request_release_readiness: {
        Row: {
          active_shortlist_count: number | null
          has_candidates: boolean | null
          has_report: boolean | null
          has_shortlist: boolean | null
          latest_report_id: string | null
          latest_report_status: string | null
          offers_count: number | null
          published_shortlist_count: number | null
          ready_to_prepare_bundle: boolean | null
          ready_to_release_to_customer: boolean | null
          reports_count: number | null
          request_code: string | null
          request_id: string | null
          snapshot_count: number | null
          total_candidates: number | null
        }
        Relationships: []
      }
      v_request_research_overview: {
        Row: {
          latest_research_finished_at: string | null
          latest_research_run_at: string | null
          latest_research_status: string | null
          request_code: string | null
          request_id: string | null
          research_items_count: number | null
          research_runs_count: number | null
          title: string | null
        }
        Relationships: []
      }
      v_request_research_summary: {
        Row: {
          last_run_created_at: string | null
          last_run_finished_at: string | null
          request_id: string | null
          shortlisted_items: number | null
          total_items: number | null
          total_runs: number | null
        }
        Relationships: [
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "research_runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      v_request_shortlist_detailed: {
        Row: {
          availability_status: string | null
          candidate_channel: string | null
          contact_notes: string | null
          currency_code: string | null
          customer_summary: string | null
          effective_final_score: number | null
          effective_fit_score: number | null
          effective_option_label: string | null
          effective_trust_score: number | null
          effective_value_score: number | null
          is_active: boolean | null
          is_recommended: boolean | null
          merchant_area: string | null
          merchant_city: string | null
          merchant_id: string | null
          merchant_name: string | null
          merchant_quote_id: string | null
          option_label: string | null
          price_amount: number | null
          product_brand: string | null
          product_model: string | null
          product_specs_summary: string | null
          product_title: string | null
          published_offer_id: string | null
          quote_valid_until: string | null
          ranking_position: number | null
          reason_summary: string | null
          reference_url: string | null
          request_id: string | null
          research_item_id: string | null
          reveal_locked: boolean | null
          shortlist_created_at: string | null
          shortlist_final_score: number | null
          shortlist_fit_score: number | null
          shortlist_id: string | null
          shortlist_trust_score: number | null
          shortlist_value_score: number | null
          source_name: string | null
          source_type: string | null
          warranty_info: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_quotes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_quotes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_directory"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_quotes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "v_merchant_profile_summary"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_published_offer_id_fkey"
            columns: ["published_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_published_offer_id_fkey"
            columns: ["published_offer_id"]
            isOneToOne: false
            referencedRelation: "v_request_offers_comparison"
            referencedColumns: ["offer_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "request_candidate_shortlists_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      v_request_shortlist_overview: {
        Row: {
          active_shortlist_count: number | null
          best_rank_position: number | null
          latest_shortlist_at: string | null
          request_code: string | null
          request_id: string | null
          title: string | null
        }
        Relationships: []
      }
      v_request_sla_monitoring: {
        Row: {
          canonical_state: string | null
          current_stage_code: string | null
          current_stage_entered_at: string | null
          current_status: string | null
          is_active_work: boolean | null
          last_transition_at: string | null
          request_code: string | null
          request_id: string | null
          sla_breach_threshold_hours: number | null
          sla_status: string | null
          sla_warning_threshold_hours: number | null
          stage_age_hours: number | null
          stage_age_minutes: number | null
          time_to_breach_hours: number | null
          urgency_level: string | null
        }
        Relationships: []
      }
      v_request_stage_clock: {
        Row: {
          canonical_state: string | null
          current_stage_code: string | null
          current_stage_entered_at: string | null
          current_status: string | null
          is_active_work: boolean | null
          last_transition_at: string | null
          request_code: string | null
          request_id: string | null
          stage_age_hours: number | null
          stage_age_minutes: number | null
        }
        Relationships: []
      }
      v_request_timeline: {
        Row: {
          actor_name: string | null
          event_at: string | null
          event_id: string | null
          event_source: string | null
          from_canonical_state: string | null
          metadata: Json | null
          notes: string | null
          request_id: string | null
          to_canonical_state: string | null
          transition_name: string | null
        }
        Relationships: []
      }
      v_request_ui_status: {
        Row: {
          active_shortlist_count: number | null
          allow_alternatives: boolean | null
          approved_for_processing: boolean | null
          budget_max: number | null
          budget_min: number | null
          client_released_at: string | null
          completed_jobs: number | null
          current_status: string | null
          customer_code: string | null
          customer_id: string | null
          customer_name: string | null
          customer_reveal_completion_pct: number | null
          customer_visible_status: string | null
          failed_jobs: number | null
          governorate: string | null
          latest_note: string | null
          latest_qualification_decision: string | null
          latest_qualification_reason: string | null
          latest_qualification_score: number | null
          latest_report_created_at: string | null
          latest_report_id: string | null
          latest_report_status: string | null
          needs_manual_review: boolean | null
          offers_count: number | null
          offline_quotes_count: number | null
          offline_shortlisted_quotes: number | null
          offline_tasks_count: number | null
          operational_stage: string | null
          payments_count: number | null
          pipeline_completion_pct: number | null
          preferred_area: string | null
          preferred_contact_method: string | null
          preferred_governorate: string | null
          preferred_language: string | null
          primary_contact: string | null
          priority_focus: string | null
          published_shortlist_count: number | null
          queued_jobs: number | null
          raw_description: string | null
          report_ready: boolean | null
          reports_count: number | null
          request_code: string | null
          request_created_at: string | null
          request_id: string | null
          request_updated_at: string | null
          research_items_count: number | null
          research_runs_count: number | null
          research_shortlisted_items: number | null
          running_jobs: number | null
          search_scope: string | null
          snapshot_count: number | null
          source_channel: string | null
          stage_status: string | null
          title: string | null
          total_jobs: number | null
          unlock_count: number | null
          waiting_approval_jobs: number | null
        }
        Relationships: []
      }
      v_requests_active: {
        Row: {
          accepted_at: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by_staff_id: string | null
          archived_by_user_id: string | null
          assigned_reviewer_staff_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_staff_id: string | null
          clarification_requested_at: string | null
          created_at: string | null
          current_status: string | null
          customer_id: string | null
          execution_requested: boolean | null
          followup_requested: boolean | null
          id: string | null
          intake_ai_confidence: number | null
          intake_ai_decision: string | null
          intake_clarification_questions: Json | null
          intake_internal_reasoning: string | null
          intake_mode: string | null
          intake_reason_code: string | null
          intake_reviewer_note: string | null
          intake_summary: string | null
          interpreted_summary: string | null
          is_archived: boolean | null
          is_cancelled: boolean | null
          is_soft_deleted: boolean | null
          pricing_decision: string | null
          pricing_notes: string | null
          raw_description: string | null
          reference_image_path: string | null
          rejected_at: string | null
          request_code: string | null
          request_kind: string | null
          reviewer_assigned_at: string | null
          reviewer_assigned_by_staff_id: string | null
          reviewer_assignment_status: string | null
          reviewer_decided_at: string | null
          reviewer_decided_by_staff_id: string | null
          reviewer_decision: string | null
          reviewer_notes: string | null
          service_fee_amount: number | null
          site_visit_requested: boolean | null
          soft_delete_reason: string | null
          soft_deleted_at: string | null
          soft_deleted_by_staff_id: string | null
          source_channel: string | null
          title: string | null
          turnaround_deadline: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by_staff_id?: string | null
          archived_by_user_id?: string | null
          assigned_reviewer_staff_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_staff_id?: string | null
          clarification_requested_at?: string | null
          created_at?: string | null
          current_status?: string | null
          customer_id?: string | null
          execution_requested?: boolean | null
          followup_requested?: boolean | null
          id?: string | null
          intake_ai_confidence?: number | null
          intake_ai_decision?: string | null
          intake_clarification_questions?: Json | null
          intake_internal_reasoning?: string | null
          intake_mode?: string | null
          intake_reason_code?: string | null
          intake_reviewer_note?: string | null
          intake_summary?: string | null
          interpreted_summary?: string | null
          is_archived?: boolean | null
          is_cancelled?: boolean | null
          is_soft_deleted?: boolean | null
          pricing_decision?: string | null
          pricing_notes?: string | null
          raw_description?: string | null
          reference_image_path?: string | null
          rejected_at?: string | null
          request_code?: string | null
          request_kind?: string | null
          reviewer_assigned_at?: string | null
          reviewer_assigned_by_staff_id?: string | null
          reviewer_assignment_status?: string | null
          reviewer_decided_at?: string | null
          reviewer_decided_by_staff_id?: string | null
          reviewer_decision?: string | null
          reviewer_notes?: string | null
          service_fee_amount?: number | null
          site_visit_requested?: boolean | null
          soft_delete_reason?: string | null
          soft_deleted_at?: string | null
          soft_deleted_by_staff_id?: string | null
          source_channel?: string | null
          title?: string | null
          turnaround_deadline?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by_staff_id?: string | null
          archived_by_user_id?: string | null
          assigned_reviewer_staff_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_staff_id?: string | null
          clarification_requested_at?: string | null
          created_at?: string | null
          current_status?: string | null
          customer_id?: string | null
          execution_requested?: boolean | null
          followup_requested?: boolean | null
          id?: string | null
          intake_ai_confidence?: number | null
          intake_ai_decision?: string | null
          intake_clarification_questions?: Json | null
          intake_internal_reasoning?: string | null
          intake_mode?: string | null
          intake_reason_code?: string | null
          intake_reviewer_note?: string | null
          intake_summary?: string | null
          interpreted_summary?: string | null
          is_archived?: boolean | null
          is_cancelled?: boolean | null
          is_soft_deleted?: boolean | null
          pricing_decision?: string | null
          pricing_notes?: string | null
          raw_description?: string | null
          reference_image_path?: string | null
          rejected_at?: string | null
          request_code?: string | null
          request_kind?: string | null
          reviewer_assigned_at?: string | null
          reviewer_assigned_by_staff_id?: string | null
          reviewer_assignment_status?: string | null
          reviewer_decided_at?: string | null
          reviewer_decided_by_staff_id?: string | null
          reviewer_decision?: string | null
          reviewer_notes?: string | null
          service_fee_amount?: number | null
          site_visit_requested?: boolean | null
          soft_delete_reason?: string | null
          soft_deleted_at?: string | null
          soft_deleted_by_staff_id?: string | null
          source_channel?: string | null
          title?: string | null
          turnaround_deadline?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_requests_assigned_reviewer"
            columns: ["assigned_reviewer_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_requests_reviewer_assigned_by"
            columns: ["reviewer_assigned_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_archived_by_staff_id_fkey"
            columns: ["archived_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_cancelled_by_staff_id_fkey"
            columns: ["cancelled_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_reviewer_decided_by_staff_id_fkey"
            columns: ["reviewer_decided_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_soft_deleted_by_staff_id_fkey"
            columns: ["soft_deleted_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      v_requests_archived_admin: {
        Row: {
          accepted_at: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by_staff_id: string | null
          archived_by_user_id: string | null
          assigned_reviewer_staff_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_staff_id: string | null
          clarification_requested_at: string | null
          created_at: string | null
          current_status: string | null
          customer_id: string | null
          execution_requested: boolean | null
          followup_requested: boolean | null
          id: string | null
          intake_ai_confidence: number | null
          intake_ai_decision: string | null
          intake_clarification_questions: Json | null
          intake_internal_reasoning: string | null
          intake_mode: string | null
          intake_reason_code: string | null
          intake_reviewer_note: string | null
          intake_summary: string | null
          interpreted_summary: string | null
          is_archived: boolean | null
          is_cancelled: boolean | null
          is_soft_deleted: boolean | null
          pricing_decision: string | null
          pricing_notes: string | null
          raw_description: string | null
          reference_image_path: string | null
          rejected_at: string | null
          request_code: string | null
          request_kind: string | null
          reviewer_assigned_at: string | null
          reviewer_assigned_by_staff_id: string | null
          reviewer_assignment_status: string | null
          reviewer_decided_at: string | null
          reviewer_decided_by_staff_id: string | null
          reviewer_decision: string | null
          reviewer_notes: string | null
          service_fee_amount: number | null
          site_visit_requested: boolean | null
          soft_delete_reason: string | null
          soft_deleted_at: string | null
          soft_deleted_by_staff_id: string | null
          source_channel: string | null
          title: string | null
          turnaround_deadline: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by_staff_id?: string | null
          archived_by_user_id?: string | null
          assigned_reviewer_staff_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_staff_id?: string | null
          clarification_requested_at?: string | null
          created_at?: string | null
          current_status?: string | null
          customer_id?: string | null
          execution_requested?: boolean | null
          followup_requested?: boolean | null
          id?: string | null
          intake_ai_confidence?: number | null
          intake_ai_decision?: string | null
          intake_clarification_questions?: Json | null
          intake_internal_reasoning?: string | null
          intake_mode?: string | null
          intake_reason_code?: string | null
          intake_reviewer_note?: string | null
          intake_summary?: string | null
          interpreted_summary?: string | null
          is_archived?: boolean | null
          is_cancelled?: boolean | null
          is_soft_deleted?: boolean | null
          pricing_decision?: string | null
          pricing_notes?: string | null
          raw_description?: string | null
          reference_image_path?: string | null
          rejected_at?: string | null
          request_code?: string | null
          request_kind?: string | null
          reviewer_assigned_at?: string | null
          reviewer_assigned_by_staff_id?: string | null
          reviewer_assignment_status?: string | null
          reviewer_decided_at?: string | null
          reviewer_decided_by_staff_id?: string | null
          reviewer_decision?: string | null
          reviewer_notes?: string | null
          service_fee_amount?: number | null
          site_visit_requested?: boolean | null
          soft_delete_reason?: string | null
          soft_deleted_at?: string | null
          soft_deleted_by_staff_id?: string | null
          source_channel?: string | null
          title?: string | null
          turnaround_deadline?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by_staff_id?: string | null
          archived_by_user_id?: string | null
          assigned_reviewer_staff_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_staff_id?: string | null
          clarification_requested_at?: string | null
          created_at?: string | null
          current_status?: string | null
          customer_id?: string | null
          execution_requested?: boolean | null
          followup_requested?: boolean | null
          id?: string | null
          intake_ai_confidence?: number | null
          intake_ai_decision?: string | null
          intake_clarification_questions?: Json | null
          intake_internal_reasoning?: string | null
          intake_mode?: string | null
          intake_reason_code?: string | null
          intake_reviewer_note?: string | null
          intake_summary?: string | null
          interpreted_summary?: string | null
          is_archived?: boolean | null
          is_cancelled?: boolean | null
          is_soft_deleted?: boolean | null
          pricing_decision?: string | null
          pricing_notes?: string | null
          raw_description?: string | null
          reference_image_path?: string | null
          rejected_at?: string | null
          request_code?: string | null
          request_kind?: string | null
          reviewer_assigned_at?: string | null
          reviewer_assigned_by_staff_id?: string | null
          reviewer_assignment_status?: string | null
          reviewer_decided_at?: string | null
          reviewer_decided_by_staff_id?: string | null
          reviewer_decision?: string | null
          reviewer_notes?: string | null
          service_fee_amount?: number | null
          site_visit_requested?: boolean | null
          soft_delete_reason?: string | null
          soft_deleted_at?: string | null
          soft_deleted_by_staff_id?: string | null
          source_channel?: string | null
          title?: string | null
          turnaround_deadline?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_requests_assigned_reviewer"
            columns: ["assigned_reviewer_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_requests_reviewer_assigned_by"
            columns: ["reviewer_assigned_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_archived_by_staff_id_fkey"
            columns: ["archived_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_cancelled_by_staff_id_fkey"
            columns: ["cancelled_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_reliability_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "requests_reviewer_decided_by_staff_id_fkey"
            columns: ["reviewer_decided_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_soft_deleted_by_staff_id_fkey"
            columns: ["soft_deleted_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      v_requests_ready_for_processing: {
        Row: {
          accepted_at: string | null
          current_status: string | null
          customer_auth_user_id: string | null
          customer_name: string | null
          existing_jobs: number | null
          is_archived: boolean | null
          is_cancelled: boolean | null
          is_soft_deleted: boolean | null
          request_code: string | null
          request_id: string | null
          reviewer_decision: string | null
          search_scope: string | null
          title: string | null
        }
        Relationships: []
      }
      v_staff_job_queue: {
        Row: {
          assigned_to_name: string | null
          assigned_to_user_id: string | null
          created_at: string | null
          error_message: string | null
          finished_at: string | null
          job_id: string | null
          job_type: string | null
          output_summary: string | null
          priority: number | null
          request_code: string | null
          request_id: string | null
          request_title: string | null
          started_at: string | null
          status: string | null
          target_team: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      v_staff_my_jobs: {
        Row: {
          assigned_to_name: string | null
          assigned_to_user_id: string | null
          created_at: string | null
          error_message: string | null
          finished_at: string | null
          job_id: string | null
          job_type: string | null
          output_summary: string | null
          priority: number | null
          request_code: string | null
          request_id: string | null
          request_title: string | null
          started_at: string | null
          status: string | null
          target_team: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_customer_request_portal_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_guest_request_tracking_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_queue"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_intake_request_workspace"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_admin_board"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_compliance_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_delivery_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_pipeline_progress"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_release_readiness"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_research_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_shortlist_overview"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_sla_monitoring"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_stage_clock"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_request_ui_status"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_archived_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_ready_for_processing"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_staff_request_workspace_overview"
            referencedColumns: ["request_id"]
          },
        ]
      }
      v_staff_request_workspace_overview: {
        Row: {
          active_shortlist_count: number | null
          best_rank_position: number | null
          budget_max: number | null
          budget_min: number | null
          client_released_at: string | null
          completed_jobs: number | null
          condition_preference: string | null
          current_status: string | null
          customer_auth_user_id: string | null
          customer_id: string | null
          customer_name: string | null
          customer_reveal_completion_pct: number | null
          customer_visible_status: string | null
          delivery_needed: boolean | null
          failed_jobs: number | null
          latest_message_at: string | null
          latest_note: string | null
          latest_qualification_decision: string | null
          latest_qualification_reason: string | null
          latest_qualification_score: number | null
          latest_report_created_at: string | null
          latest_report_id: string | null
          latest_report_status: string | null
          latest_research_finished_at: string | null
          latest_research_run_at: string | null
          latest_research_status: string | null
          latest_shortlist_at: string | null
          merchant_matches_count: number | null
          message_audit_count: number | null
          notes: string | null
          offline_quotes_count: number | null
          offline_shortlisted_quotes: number | null
          offline_tasks_count: number | null
          operational_stage: string | null
          pipeline_completion_pct: number | null
          preferred_area: string | null
          preferred_brands: string | null
          preferred_governorate: string | null
          preferred_language: string | null
          preferred_models: string | null
          preferred_specs: string | null
          priority_focus: string | null
          published_shortlist_count: number | null
          queued_jobs: number | null
          raw_description: string | null
          reports_count: number | null
          request_code: string | null
          request_created_at: string | null
          request_id: string | null
          request_updated_at: string | null
          research_items_count: number | null
          research_runs_count: number | null
          research_shortlisted_items: number | null
          running_jobs: number | null
          search_scope: string | null
          snapshot_count: number | null
          source_channel: string | null
          stage_status: string | null
          title: string | null
          total_jobs: number | null
          unlock_count: number | null
          waiting_approval_jobs: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_ip: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          reset_timestamp: string
        }[]
      }
      classify_trend: { Args: { pct_change: number }; Returns: string }
      compute_all_price_trends: { Args: never; Returns: undefined }
      compute_product_trend: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      compute_trend_score: {
        Args: {
          current_price: number
          highest_price: number
          lowest_price: number
          pct_30d: number
        }
        Returns: number
      }
      fn_admin_approve_report: {
        Args: { p_actor_staff_id: string; p_note?: string; p_report_id: string }
        Returns: {
          approved_at: string
          report_id: string
          report_status: string
          request_id: string
        }[]
      }
      fn_admin_archive_request: {
        Args: {
          p_actor_staff_id?: string
          p_reason?: string
          p_request_id: string
        }
        Returns: {
          is_archived: boolean
          is_cancelled: boolean
          is_soft_deleted: boolean
          request_id: string
        }[]
      }
      fn_admin_cancel_request: {
        Args: {
          p_actor_staff_id?: string
          p_reason?: string
          p_request_id: string
        }
        Returns: {
          is_archived: boolean
          is_cancelled: boolean
          is_soft_deleted: boolean
          request_id: string
        }[]
      }
      fn_admin_restore_request: {
        Args: {
          p_actor_staff_id?: string
          p_reason?: string
          p_request_id: string
        }
        Returns: {
          is_archived: boolean
          is_cancelled: boolean
          is_soft_deleted: boolean
          request_id: string
        }[]
      }
      fn_admin_set_customer_phone_verification: {
        Args: {
          p_actor_staff_id: string
          p_customer_id: string
          p_note?: string
          p_verified?: boolean
        }
        Returns: {
          contact_synced: boolean
          customer_id: string
          event_type: string
          phone_number_normalized: string
          phone_verified_at: string
        }[]
      }
      fn_admin_soft_delete_request: {
        Args: {
          p_actor_staff_id?: string
          p_reason?: string
          p_request_id: string
        }
        Returns: {
          is_archived: boolean
          is_cancelled: boolean
          is_soft_deleted: boolean
          request_id: string
        }[]
      }
      fn_admin_unlock_report_option: {
        Args: {
          p_actor_staff_id: string
          p_note?: string
          p_report_option_snapshot_id: string
        }
        Returns: {
          customer_id: string
          report_option_snapshot_id: string
          request_id: string
          reveals_remaining: number
          unlock_status: string
        }[]
      }
      fn_apply_request_compliance_decision: {
        Args: {
          p_action_source?: string
          p_actor_staff_id?: string
          p_apply_to_request?: boolean
          p_decision: string
          p_metadata?: Json
          p_reason?: string
          p_request_id: string
          p_summary?: string
        }
        Returns: {
          applied_decision: string
          needs_manual_review: boolean
          new_status: string
          previous_status: string
          request_id: string
        }[]
      }
      fn_archive_request: {
        Args: {
          p_actor_user_id?: string
          p_reason?: string
          p_request_id: string
        }
        Returns: number
      }
      fn_assign_staff_member: {
        Args: {
          p_can_approve_requests?: boolean
          p_can_manage_merchants?: boolean
          p_can_view_financials?: boolean
          p_email: string
          p_full_name: string
          p_is_active?: boolean
          p_staff_role: string
          p_team_code: string
        }
        Returns: {
          archived_at: string | null
          auth_user_id: string
          can_approve_requests: boolean
          can_manage_merchants: boolean
          can_view_financials: boolean
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          is_archived: boolean | null
          staff_role: string
          team_code: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "staff_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_can_track_request_by_code_and_phone: {
        Args: { p_phone_input: string; p_request_code: string }
        Returns: boolean
      }
      fn_claim_agent_job: {
        Args: { p_actor_user_id?: string; p_job_id: string }
        Returns: {
          assigned_to_user_id: string
          job_id: string
          job_type: string
          request_id: string
          started_at: string
          status: string
        }[]
      }
      fn_complete_agent_job: {
        Args: {
          p_actor_user_id?: string
          p_job_id: string
          p_output_payload?: Json
          p_output_summary?: string
        }
        Returns: {
          finished_at: string
          job_id: string
          job_type: string
          request_id: string
          status: string
        }[]
      }
      fn_complete_research_run: {
        Args: {
          p_research_run_id: string
          p_status?: string
          p_summary?: string
        }
        Returns: {
          finished_at: string
          research_run_id: string
          status: string
        }[]
      }
      fn_compute_canonical_state: {
        Args: {
          p_client_released_at: string
          p_current_status: string
          p_is_archived: boolean
          p_reviewer_decision: string
        }
        Returns: string
      }
      fn_count_active_requests: { Args: never; Returns: number }
      fn_create_research_run: {
        Args: {
          p_job_id?: string
          p_query_text?: string
          p_request_id: string
          p_run_kind?: string
          p_search_scope?: string
          p_status?: string
          p_summary?: string
        }
        Returns: {
          request_id: string
          research_run_id: string
          status: string
        }[]
      }
      fn_create_sourcing_request: {
        Args: {
          p_additional_notes?: string
          p_category: string
          p_channel?: string
          p_customer_id: string
          p_customer_name: string
          p_customer_phone: string | null
          p_execution_requested?: boolean
          p_followup_requested?: boolean
          p_intake_mode?: string
          p_max_price?: number
          p_preferences?: Json
          p_pricing_decision?: string
          p_product_name: string
          p_raw_description?: string
          p_reference_image_path?: string
          p_request_code?: string
          p_request_id: string
          p_request_kind?: string
          p_service_fee_amount?: number
          p_site_visit_requested?: boolean
          p_status?: string
          p_target_location: string
          p_title?: string
          p_is_business?: boolean
          p_business_metadata?: Json
          p_rfq_document?: string
          p_metadata?: Json
          p_source_type?: string
          p_ai_confidence?: number
        }
        Returns: Json
      }
      fn_create_sourcing_request_idempotent: {
        Args: {
          p_additional_notes?: string
          p_category: string
          p_channel?: string
          p_customer_id: string
          p_customer_name: string
          p_customer_phone: string | null
          p_execution_requested?: boolean
          p_followup_requested?: boolean
          p_intake_mode?: string
          p_max_price?: number
          p_preferences?: Json
          p_pricing_decision?: string
          p_product_name: string
          p_raw_description?: string
          p_reference_image_path?: string
          p_request_code?: string
          p_request_id: string
          p_request_kind?: string
          p_service_fee_amount?: number
          p_site_visit_requested?: boolean
          p_status?: string
          p_target_location: string
          p_title?: string
          p_is_business?: boolean
          p_business_metadata?: Json
          p_rfq_document?: string
          p_metadata?: Json
          p_source_type?: string
          p_ai_confidence?: number
          p_idempotency_key?: string
          p_payload_hash?: string
        }
        Returns: Json
      }
      fn_customer_reveal_allowance: {
        Args: { p_customer_id: string }
        Returns: {
          can_reveal: boolean
          customer_id: string
          monthly_reveal_limit: number
          plan_code: string
          reveals_remaining: number
          reveals_used: number
          subscription_id: string
        }[]
      }
      fn_ensure_request_operational_state: {
        Args: { p_request_id: string }
        Returns: string
      }
      fn_evaluate_request_compliance_from_hits: {
        Args: {
          p_action_source?: string
          p_actor_staff_id?: string
          p_apply_to_request?: boolean
          p_request_id: string
        }
        Returns: {
          action_logged: boolean
          applied_to_request: boolean
          blocked_hits: number
          manual_review_hits: number
          matched_rule_codes: string[]
          recommended_decision: string
          request_id: string
          total_hits: number
          warning_hits: number
        }[]
      }
      fn_execute_request_transition: {
        Args: {
          p_actor_staff_id: string
          p_metadata?: Json
          p_notes?: string
          p_request_id: string
          p_transition_name: string
        }
        Returns: Json
      }
      fn_fail_agent_job: {
        Args: {
          p_actor_user_id?: string
          p_error_message: string
          p_job_id: string
        }
        Returns: {
          error_message: string
          job_id: string
          job_type: string
          request_id: string
          status: string
        }[]
      }
      fn_generate_referral_code: { Args: never; Returns: string }
      fn_get_financial_summary: { Args: never; Returns: Json }
      fn_get_stabilizer_multiplier: { Args: never; Returns: number }
      fn_guest_track_request_by_code_and_phone: {
        Args: { p_phone_normalized: string; p_request_code: string }
        Returns: {
          current_status: string
          customer_visible_status: string
          pipeline_completion_pct: number
          request_code: string
          request_created_at: string
          request_id: string
          request_updated_at: string
          title: string
        }[]
      }
      fn_handle_request_job_handoff: {
        Args: { p_actor_user_id?: string; p_job_id: string }
        Returns: undefined
      }
      fn_hard_delete_request_with_backup: {
        Args: {
          p_actor_staff_id: string
          p_backup_id: string
          p_delete_notes?: string
          p_request_id: string
        }
        Returns: boolean
      }
      fn_insert_research_item: {
        Args: {
          p_availability_status?: string
          p_currency_code?: string
          p_final_score?: number
          p_fit_score?: number
          p_is_candidate?: boolean
          p_is_shortlisted?: boolean
          p_listing_url?: string
          p_option_label?: string
          p_price_amount?: number
          p_price_change_note?: string
          p_price_last_checked_at?: string
          p_product_brand?: string
          p_product_model?: string
          p_product_specs_summary?: string
          p_product_title?: string
          p_raw_payload?: Json
          p_request_id: string
          p_research_run_id: string
          p_seller_location?: string
          p_seller_name?: string
          p_source_name?: string
          p_source_type?: string
          p_trust_score?: number
          p_value_score?: number
          p_warranty_info?: string
        }
        Returns: {
          request_id: string
          research_item_id: string
          research_run_id: string
        }[]
      }
      fn_is_active_staff_4a: { Args: never; Returns: boolean }
      fn_is_active_staff_7b: { Args: never; Returns: boolean }
      fn_is_contributor_hr: { Args: never; Returns: boolean }
      fn_is_staff: { Args: { p_user_id?: string }; Returns: boolean }
      fn_is_staff_manager: { Args: never; Returns: boolean }
      fn_lock_and_insert_transaction: {
        Args: {
          p_amount_egp: number
          p_amount_points: number
          p_contributor_id: string
          p_description_ar: string
          p_description_en: string
          p_idempotency_key?: string
          p_metadata?: Json
          p_reference_id: string
          p_reference_type: string
          p_tx_type: string
          p_wallet_id: string
        }
        Returns: Json
      }
      fn_log_request_compliance_hit: {
        Args: {
          p_actor_staff_id?: string
          p_confidence_score?: number
          p_language_code?: string
          p_match_source?: string
          p_matched_excerpt?: string
          p_matched_keyword?: string
          p_metadata?: Json
          p_notes?: string
          p_request_id: string
          p_rule_code: string
        }
        Returns: {
          created_at: string
          decision_mode: string
          hit_id: string
          request_id: string
          rule_category: string
          rule_code: string
        }[]
      }
      fn_log_request_customer_message: {
        Args: {
          p_body_text?: string
          p_created_by_staff_id?: string
          p_delivery_channel?: string
          p_delivery_status?: string
          p_language_code?: string
          p_message_type?: string
          p_report_id?: string
          p_request_id: string
          p_subject_text?: string
        }
        Returns: {
          delivery_status: string
          language_code: string
          message_audit_id: string
          message_type: string
          request_id: string
        }[]
      }
      fn_mark_agent_job_waiting_approval: {
        Args: {
          p_actor_user_id?: string
          p_job_id: string
          p_output_payload?: Json
          p_output_summary?: string
        }
        Returns: {
          job_id: string
          job_type: string
          request_id: string
          status: string
        }[]
      }
      fn_normalize_phone_eg: { Args: { p_input: string }; Returns: string }
      fn_prepare_request_client_bundle: {
        Args: {
          p_actor_user_id?: string
          p_max_options?: number
          p_note?: string
          p_report_id: string
          p_request_id: string
        }
        Returns: {
          operational_stage: string
          published_offers: number
          request_id: string
          snapshot_count: number
          stage_status: string
        }[]
      }
      fn_prepare_snapshots_from_shortlist: {
        Args: { p_request_id: string; p_snapshot_kind?: string }
        Returns: {
          created_snapshots: number
          request_id: string
          total_active_shortlist: number
        }[]
      }
      fn_publish_request_shortlist_to_offers: {
        Args: { p_request_id: string }
        Returns: {
          candidate_channel: string
          offer_id: string
          ranking_position: number
          shortlist_id: string
        }[]
      }
      fn_rate_merchant: {
        Args: {
          p_actor_staff_id?: string
          p_merchant_id: string
          p_note?: string
          p_overall_score?: number
          p_price_competitiveness_score?: number
          p_quality_score?: number
          p_reliability_score?: number
          p_request_id?: string
          p_service_score?: number
        }
        Returns: {
          evaluations_count: number
          merchant_id: string
          new_overall_score: number
          new_price_competitiveness_score: number
          new_quality_score: number
          new_reliability_score: number
          new_service_score: number
        }[]
      }
      fn_refresh_vendor_trust_from_reviews: {
        Args: { p_vendor_id: string }
        Returns: undefined
      }
      fn_register_vendor:
        | {
            Args: {
              p_address: string
              p_area: string
              p_business_name_ar: string
              p_business_name_en: string
              p_category: string
              p_city: string
              p_email: string
              p_governorate: string
              p_merchant_type: string
              p_notes: string
              p_primary_phone: string
              p_secondary_phone: string
              p_website: string
            }
            Returns: string
          }
        | {
            Args: {
              p_address: string
              p_area: string
              p_auth_user_id?: string
              p_business_name_ar: string
              p_business_name_en: string
              p_category: string
              p_city: string
              p_email: string
              p_governorate: string
              p_merchant_type: string
              p_notes: string
              p_primary_phone: string
              p_secondary_phone: string
              p_website: string
            }
            Returns: string
          }
      fn_release_request_to_customer: {
        Args: {
          p_actor_user_id?: string
          p_note?: string
          p_request_id: string
        }
        Returns: {
          client_released_at: string
          notify_job_created: boolean
          operational_stage: string
          request_id: string
          stage_status: string
        }[]
      }
      fn_release_request_to_customer_by_staff: {
        Args: {
          p_actor_staff_id: string
          p_note?: string
          p_request_id: string
        }
        Returns: {
          client_released_at: string
          notify_job_created: boolean
          operational_stage: string
          request_id: string
          stage_status: string
        }[]
      }
      fn_resolve_canonical_state: {
        Args: {
          p_client_released_at: string
          p_current_status: string
          p_is_archived: boolean
          p_reviewer_decision: string
        }
        Returns: string
      }
      fn_restore_request: {
        Args: { p_actor_user_id?: string; p_request_id: string }
        Returns: number
      }
      fn_review_request: {
        Args: {
          p_actor_staff_id?: string
          p_decision: string
          p_intake_ai_confidence?: number
          p_intake_ai_decision?: string
          p_intake_clarification_questions?: Json
          p_intake_internal_reasoning?: string
          p_intake_reason_code?: string
          p_intake_summary?: string
          p_note?: string
          p_request_id: string
        }
        Returns: {
          new_status: string
          previous_status: string
          request_id: string
          reviewer_decision: string
        }[]
      }
      fn_run_economy_stabilizer: { Args: never; Returns: Json }
      fn_save_merchant_from_research_item: {
        Args: {
          p_actor_staff_id?: string
          p_note?: string
          p_research_item_id: string
        }
        Returns: {
          action_taken: string
          merchant_id: string
          merchant_name: string
        }[]
      }
      fn_set_request_operational_stage: {
        Args: {
          p_actor_user_id?: string
          p_approved_for_processing?: boolean
          p_needs_manual_review?: boolean
          p_note?: string
          p_operational_stage: string
          p_report_ready?: boolean
          p_request_id: string
          p_stage_status: string
        }
        Returns: {
          approved_for_processing: boolean
          needs_manual_review: boolean
          operational_stage: string
          report_ready: boolean
          request_id: string
          stage_status: string
        }[]
      }
      fn_shortlist_research_item: {
        Args: {
          p_actor_staff_id: string
          p_customer_summary?: string
          p_is_recommended?: boolean
          p_ranking_position?: number
          p_reason_summary?: string
          p_request_id: string
          p_research_item_id: string
          p_reveal_locked?: boolean
        }
        Returns: {
          ranking_position: number
          request_id: string
          research_item_id: string
          shortlist_id: string
        }[]
      }
      fn_staff_has_role: { Args: { p_role: string }; Returns: boolean }
      fn_staff_role: { Args: { p_user_id?: string }; Returns: string }
      fn_staff_team: { Args: { p_user_id?: string }; Returns: string }
      fn_start_request_processing_after_approval: {
        Args: {
          p_actor_staff_id: string
          p_force?: boolean
          p_note?: string
          p_request_id: string
        }
        Returns: {
          created_jobs: number
          new_status: string
          operational_stage: string
          previous_status: string
          request_id: string
          search_scope: string
          stage_status: string
        }[]
      }
      fn_submit_request_for_processing: {
        Args: {
          p_actor_user_id?: string
          p_force?: boolean
          p_note?: string
          p_request_id: string
        }
        Returns: {
          created_jobs: number
          operational_stage: string
          request_id: string
          search_scope: string
          stage_status: string
        }[]
      }
      fn_sync_report_option_snapshots: {
        Args: { p_max_options?: number; p_report_id: string }
        Returns: number
      }
      fn_sync_request_current_status: {
        Args: { p_request_id: string }
        Returns: {
          customer_visible_status: string
          new_status: string
          previous_status: string
          request_id: string
        }[]
      }
      fn_track_request_by_code_and_phone: {
        Args: { p_phone_input: string; p_request_code: string }
        Returns: {
          client_released_at: string
          current_status: string
          customer_id: string
          customer_name: string
          customer_reveal_completion_pct: number
          customer_visible_status: string
          latest_report_created_at: string
          latest_report_id: string
          latest_report_status: string
          operational_stage: string
          pipeline_completion_pct: number
          preferred_language: string
          raw_description: string
          reports_count: number
          request_code: string
          request_created_at: string
          request_id: string
          request_updated_at: string
          search_scope: string
          snapshot_count: number
          source_channel: string
          stage_status: string
          title: string
          unlock_count: number
        }[]
      }
      fn_unlock_report_option: {
        Args: { p_report_option_snapshot_id: string }
        Returns: {
          customer_id: string
          report_option_snapshot_id: string
          request_id: string
          reveals_remaining: number
          unlock_status: string
        }[]
      }
      fn_vendor_activate: {
        Args: { p_actor_id?: string; p_vendor_id: string }
        Returns: undefined
      }
      fn_vendor_adjust_trust: {
        Args: {
          p_actor_id?: string
          p_delta: number
          p_reason?: string
          p_vendor_id: string
        }
        Returns: Json
      }
      fn_vendor_suspend: {
        Args: { p_actor_id?: string; p_reason?: string; p_vendor_id: string }
        Returns: undefined
      }
      fn_wallet_reconciliation_check: {
        Args: never
        Returns: {
          actual_total: number
          contributor_id: string
          difference: number
          expected_total: number
          wallet_id: string
        }[]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
