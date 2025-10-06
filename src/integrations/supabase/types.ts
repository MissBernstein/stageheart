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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      feeling_cards: {
        Row: {
          access_ideas: string[]
          core_feelings: string[]
          created_at: string
          id: string
          song_id: string
          summary: string
          theme: string
          visual: string | null
        }
        Insert: {
          access_ideas: string[]
          core_feelings: string[]
          created_at?: string
          id?: string
          song_id: string
          summary: string
          theme: string
          visual?: string | null
        }
        Update: {
          access_ideas?: string[]
          core_feelings?: string[]
          created_at?: string
          id?: string
          song_id?: string
          summary?: string
          theme?: string
          visual?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feeling_cards_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_warmups: {
        Row: {
          created_at: string
          duration: number
          emotional_prep: string[]
          id: string
          physical_warmups: string[]
          song_artist: string | null
          song_title: string | null
          user_id: string
          vibe: string | null
          vocal_warmups: string[]
        }
        Insert: {
          created_at?: string
          duration: number
          emotional_prep: string[]
          id?: string
          physical_warmups: string[]
          song_artist?: string | null
          song_title?: string | null
          user_id: string
          vibe?: string | null
          vocal_warmups: string[]
        }
        Update: {
          created_at?: string
          duration?: number
          emotional_prep?: string[]
          id?: string
          physical_warmups?: string[]
          song_artist?: string | null
          song_title?: string | null
          user_id?: string
          vibe?: string | null
          vocal_warmups?: string[]
        }
        Relationships: []
      }
      songs: {
        Row: {
          artist: string
          created_at: string
          id: string
          is_cover: boolean | null
          parent_song_id: string | null
          public_id: string | null
          slug: string
          song_title: string | null
          title: string
          version_label: string | null
        }
        Insert: {
          artist: string
          created_at?: string
          id?: string
          is_cover?: boolean | null
          parent_song_id?: string | null
          public_id?: string | null
          slug: string
          song_title?: string | null
          title: string
          version_label?: string | null
        }
        Update: {
          artist?: string
          created_at?: string
          id?: string
          is_cover?: boolean | null
          parent_song_id?: string | null
          public_id?: string | null
          slug?: string
          song_title?: string | null
          title?: string
          version_label?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          artist: string
          created_at: string
          error: string | null
          id: string
          processed_at: string | null
          slug: string
          status: Database["public"]["Enums"]["submission_status"]
          title: string
        }
        Insert: {
          artist: string
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["submission_status"]
          title: string
        }
        Update: {
          artist?: string
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["submission_status"]
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      submission_status:
        | "QUEUED"
        | "PROCESSING"
        | "REVIEW"
        | "PUBLISHED"
        | "REJECTED"
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
      submission_status: [
        "QUEUED",
        "PROCESSING",
        "REVIEW",
        "PUBLISHED",
        "REJECTED",
      ],
    },
  },
} as const
