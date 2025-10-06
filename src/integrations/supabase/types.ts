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
      comments: {
        Row: {
          author_user_id: string
          body: string
          created_at: string | null
          id: string
          recording_id: string
          state: Database["public"]["Enums"]["comment_state"] | null
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string | null
          id?: string
          recording_id: string
          state?: Database["public"]["Enums"]["comment_state"] | null
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string | null
          id?: string
          recording_id?: string
          state?: Database["public"]["Enums"]["comment_state"] | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
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
      messages: {
        Row: {
          body: string
          created_at: string | null
          from_user_id: string
          id: string
          is_read: boolean | null
          to_user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          from_user_id: string
          id?: string
          is_read?: boolean | null
          to_user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          from_user_id?: string
          id?: string
          is_read?: boolean | null
          to_user_id?: string
        }
        Relationships: []
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
      recording_meets: {
        Row: {
          id: string
          listener_user_id: string
          met_at: string | null
          recording_id: string
        }
        Insert: {
          id?: string
          listener_user_id: string
          met_at?: string | null
          recording_id: string
        }
        Update: {
          id?: string
          listener_user_id?: string
          met_at?: string | null
          recording_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_meets_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      recording_reports: {
        Row: {
          created_at: string | null
          id: string
          reason: string
          recording_id: string
          reporter_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason: string
          recording_id: string
          reporter_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string
          recording_id?: string
          reporter_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recording_reports_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          comments_enabled: boolean | null
          created_at: string | null
          duration_sec: number | null
          file_original_url: string | null
          file_stream_url: string | null
          filesize_bytes: number | null
          format_original:
            | Database["public"]["Enums"]["recording_format"]
            | null
          format_stream: Database["public"]["Enums"]["recording_format"] | null
          id: string
          is_signature: boolean | null
          language: string | null
          loudness_lufs: number | null
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          mood_tags: string[] | null
          plays_count: number | null
          reports_count: number | null
          state: Database["public"]["Enums"]["recording_state"] | null
          title: string
          updated_at: string | null
          user_id: string
          voice_type: string | null
          waveform_json_url: string | null
        }
        Insert: {
          comments_enabled?: boolean | null
          created_at?: string | null
          duration_sec?: number | null
          file_original_url?: string | null
          file_stream_url?: string | null
          filesize_bytes?: number | null
          format_original?:
            | Database["public"]["Enums"]["recording_format"]
            | null
          format_stream?: Database["public"]["Enums"]["recording_format"] | null
          id?: string
          is_signature?: boolean | null
          language?: string | null
          loudness_lufs?: number | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          mood_tags?: string[] | null
          plays_count?: number | null
          reports_count?: number | null
          state?: Database["public"]["Enums"]["recording_state"] | null
          title: string
          updated_at?: string | null
          user_id: string
          voice_type?: string | null
          waveform_json_url?: string | null
        }
        Update: {
          comments_enabled?: boolean | null
          created_at?: string | null
          duration_sec?: number | null
          file_original_url?: string | null
          file_stream_url?: string | null
          filesize_bytes?: number | null
          format_original?:
            | Database["public"]["Enums"]["recording_format"]
            | null
          format_stream?: Database["public"]["Enums"]["recording_format"] | null
          id?: string
          is_signature?: boolean | null
          language?: string | null
          loudness_lufs?: number | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          mood_tags?: string[] | null
          plays_count?: number | null
          reports_count?: number | null
          state?: Database["public"]["Enums"]["recording_state"] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          voice_type?: string | null
          waveform_json_url?: string | null
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
      user_profiles: {
        Row: {
          about: string | null
          comments_enabled: boolean | null
          contact_visibility:
            | Database["public"]["Enums"]["profile_field_visibility"]
            | null
          created_at: string | null
          display_name: string
          dm_enabled: boolean | null
          fav_genres: string[] | null
          favorite_artists: string[] | null
          groups: string[] | null
          id: string
          links: Json | null
          profile_note_to_listeners: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          updated_at: string | null
        }
        Insert: {
          about?: string | null
          comments_enabled?: boolean | null
          contact_visibility?:
            | Database["public"]["Enums"]["profile_field_visibility"]
            | null
          created_at?: string | null
          display_name: string
          dm_enabled?: boolean | null
          fav_genres?: string[] | null
          favorite_artists?: string[] | null
          groups?: string[] | null
          id: string
          links?: Json | null
          profile_note_to_listeners?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
        }
        Update: {
          about?: string | null
          comments_enabled?: boolean | null
          contact_visibility?:
            | Database["public"]["Enums"]["profile_field_visibility"]
            | null
          created_at?: string | null
          display_name?: string
          dm_enabled?: boolean | null
          fav_genres?: string[] | null
          favorite_artists?: string[] | null
          groups?: string[] | null
          id?: string
          links?: Json | null
          profile_note_to_listeners?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_recording_plays: {
        Args: { recording_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      comment_state: "pending" | "published" | "rejected"
      link_type: "website" | "instagram" | "tiktok" | "email" | "other"
      moderation_status: "clean" | "pending" | "flagged" | "blocked"
      profile_field_visibility: "public" | "after_meet" | "private"
      recording_format: "wav" | "m4a" | "mp3" | "opus"
      recording_state: "private" | "unlisted" | "public"
      submission_status:
        | "QUEUED"
        | "PROCESSING"
        | "REVIEW"
        | "PUBLISHED"
        | "REJECTED"
      user_status: "active" | "suspended"
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
      comment_state: ["pending", "published", "rejected"],
      link_type: ["website", "instagram", "tiktok", "email", "other"],
      moderation_status: ["clean", "pending", "flagged", "blocked"],
      profile_field_visibility: ["public", "after_meet", "private"],
      recording_format: ["wav", "m4a", "mp3", "opus"],
      recording_state: ["private", "unlisted", "public"],
      submission_status: [
        "QUEUED",
        "PROCESSING",
        "REVIEW",
        "PUBLISHED",
        "REJECTED",
      ],
      user_status: ["active", "suspended"],
    },
  },
} as const
