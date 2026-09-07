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
      activities: {
        Row: {
          activity_type_id: string | null
          allow_outside_project: boolean
          archived_at: string | null
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          name: string
          notes: string
          priority: Database["public"]["Enums"]["activity_priority"]
          project_id: string
          project_timing_boundary: string | null
          project_timing_offset_days: number | null
          project_timing_rule: string | null
          start_date: string
          status: Database["public"]["Enums"]["activity_status"]
          updated_at: string
        }
        Insert: {
          activity_type_id?: string | null
          allow_outside_project?: boolean
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          name: string
          notes?: string
          priority?: Database["public"]["Enums"]["activity_priority"]
          project_id: string
          project_timing_boundary?: string | null
          project_timing_offset_days?: number | null
          project_timing_rule?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["activity_status"]
          updated_at?: string
        }
        Update: {
          activity_type_id?: string | null
          allow_outside_project?: boolean
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          name?: string
          notes?: string
          priority?: Database["public"]["Enums"]["activity_priority"]
          project_id?: string
          project_timing_boundary?: string | null
          project_timing_offset_days?: number | null
          project_timing_rule?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["activity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_dependencies: {
        Row: {
          activity_id: string
          archived_at: string | null
          constraint_type: Database["public"]["Enums"]["dependency_type"]
          created_at: string
          depends_on_activity_id: string
          id: string
          offset_days: number
        }
        Insert: {
          activity_id: string
          archived_at?: string | null
          constraint_type?: Database["public"]["Enums"]["dependency_type"]
          created_at?: string
          depends_on_activity_id: string
          id?: string
          offset_days?: number
        }
        Update: {
          activity_id?: string
          archived_at?: string | null
          constraint_type?: Database["public"]["Enums"]["dependency_type"]
          created_at?: string
          depends_on_activity_id?: string
          id?: string
          offset_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_dependencies_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_dependencies_depends_on_activity_id_fkey"
            columns: ["depends_on_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_links: {
        Row: {
          activity_id: string
          archived_at: string | null
          id: string
          label: string | null
          sort_order: number
          url: string
        }
        Insert: {
          activity_id: string
          archived_at?: string | null
          id?: string
          label?: string | null
          sort_order?: number
          url: string
        }
        Update: {
          activity_id?: string
          archived_at?: string | null
          id?: string
          label?: string | null
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_links_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_owners: {
        Row: {
          activity_id: string
          team_member_id: string
        }
        Insert: {
          activity_id: string
          team_member_id: string
        }
        Update: {
          activity_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_owners_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_owners_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_types: {
        Row: {
          archived_at: string | null
          color: string
          id: string
          name: string
        }
        Insert: {
          archived_at?: string | null
          color?: string
          id?: string
          name: string
        }
        Update: {
          archived_at?: string | null
          color?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_color: string
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_owners: {
        Row: {
          project_id: string
          team_member_id: string
        }
        Insert: {
          project_id: string
          team_member_id: string
        }
        Update: {
          project_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_owners_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_owners_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_activities: {
        Row: {
          activity_type_id: string
          archived_at: string | null
          created_at: string
          duration_days: number
          id: string
          name: string
          sort_order: number
          template_id: string
          updated_at: string
        }
        Insert: {
          activity_type_id: string
          archived_at?: string | null
          created_at?: string
          duration_days?: number
          id?: string
          name: string
          sort_order?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          activity_type_id?: string
          archived_at?: string | null
          created_at?: string
          duration_days?: number
          id?: string
          name?: string
          sort_order?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_activities_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_activities_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_activity_rules: {
        Row: {
          created_at: string
          id: string
          offset_days: number
          relative_activity_id: string | null
          schedule_rule: Database["public"]["Enums"]["template_schedule_rule"]
          sort_order: number
          template_activity_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          offset_days: number
          relative_activity_id?: string | null
          schedule_rule: Database["public"]["Enums"]["template_schedule_rule"]
          sort_order?: number
          template_activity_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          offset_days?: number
          relative_activity_id?: string | null
          schedule_rule?: Database["public"]["Enums"]["template_schedule_rule"]
          sort_order?: number
          template_activity_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_activity_rules_relative_activity_id_fkey"
            columns: ["relative_activity_id"]
            isOneToOne: false
            referencedRelation: "project_template_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_activity_rules_template_activity_id_fkey"
            columns: ["template_activity_id"]
            isOneToOne: false
            referencedRelation: "project_template_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          project_type_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          project_type_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          project_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_project_type_id_fkey"
            columns: ["project_type_id"]
            isOneToOne: false
            referencedRelation: "project_types"
            referencedColumns: ["id"]
          },
        ]
      }
      project_types: {
        Row: {
          archived_at: string | null
          color: string
          id: string
          name: string
        }
        Insert: {
          archived_at?: string | null
          color?: string
          id?: string
          name: string
        }
        Update: {
          archived_at?: string | null
          color?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string
          end_date: string
          id: string
          name: string
          project_type_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_date: string
          id?: string
          name: string
          project_type_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_date?: string
          id?: string
          name?: string
          project_type_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_project_type_id_fkey"
            columns: ["project_type_id"]
            isOneToOne: false
            referencedRelation: "project_types"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          active: boolean
          archived_at: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          initials: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          archived_at?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          initials: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          archived_at?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          initials?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_activity: { Args: { p_activity_id: string }; Returns: undefined }
      archive_project: { Args: { p_project_id: string }; Returns: undefined }
      archive_project_template: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      archive_project_template_activity: {
        Args: { p_activity_id: string }
        Returns: undefined
      }
      calculate_project_reschedule: {
        Args: { p_new_end: string; p_new_start: string; p_project_id: string }
        Returns: Json
      }
      complete_project_reschedule_plan: {
        Args: { p_plan: Json }
        Returns: Json
      }
      create_project_from_template: {
        Args: {
          p_project_end: string
          p_project_name: string
          p_template_id: string
        }
        Returns: string
      }
      discover_activity_mutation_scope: {
        Args: {
          p_activity_id: string
          p_dependencies?: Json
          p_new_project_id: string
        }
        Returns: string[]
      }
      discover_project_schedule_scope: {
        Args: { p_project_ids: string[] }
        Returns: string[]
      }
      lock_activity_mutation_scope: {
        Args: {
          p_activity_id: string
          p_dependencies?: Json
          p_new_project_id: string
          p_timeout_ms?: number
        }
        Returns: string[]
      }
      lock_project_schedule_rows: {
        Args: { p_project_ids: string[] }
        Returns: undefined
      }
      lock_project_schedule_scope: {
        Args: { p_project_ids: string[]; p_timeout_ms?: number }
        Returns: string[]
      }
      lock_project_schedule_set: {
        Args: { p_project_ids: string[]; p_timeout_ms?: number }
        Returns: string[]
      }
      preview_project_reschedule: {
        Args: { p_new_end: string; p_new_start: string; p_project_id: string }
        Returns: Json
      }
      preview_project_template: {
        Args: { p_project_end: string; p_template_id: string }
        Returns: Json
      }
      project_schedule_fingerprint: {
        Args: { p_project_id: string }
        Returns: string
      }
      project_schedule_lock_key: {
        Args: { p_project_id: string }
        Returns: number
      }
      reschedule_project: {
        Args: {
          p_expected_schedule_fingerprint?: string
          p_owner_ids?: string[]
          p_project: Json
        }
        Returns: Json
      }
      save_activity: {
        Args: {
          p_activity: Json
          p_dependencies?: Json
          p_links?: Json
          p_owner_ids?: string[]
        }
        Returns: string
      }
      save_project: {
        Args: { p_owner_ids?: string[]; p_project: Json }
        Returns: string
      }
      save_project_template: { Args: { p_template: Json }; Returns: string }
      save_project_template_activity: {
        Args: { p_activity: Json }
        Returns: string
      }
      validate_project_schedule: {
        Args: { p_project_id: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_priority: "low" | "normal" | "high" | "urgent"
      activity_status: "not_started" | "in_progress" | "blocked" | "completed"
      dependency_type: "finish_to_start" | "finish_to_finish"
      project_status: "draft" | "on_track" | "at_risk" | "blocked" | "completed"
      template_schedule_rule:
        | "finish_before_project_end"
        | "finish_after_project_end"
        | "start_after_activity_finish"
        | "finish_after_activity_finish"
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
      activity_priority: ["low", "normal", "high", "urgent"],
      activity_status: ["not_started", "in_progress", "blocked", "completed"],
      dependency_type: ["finish_to_start", "finish_to_finish"],
      project_status: ["draft", "on_track", "at_risk", "blocked", "completed"],
      template_schedule_rule: [
        "finish_before_project_end",
        "finish_after_project_end",
        "start_after_activity_finish",
        "finish_after_activity_finish",
      ],
    },
  },
} as const
