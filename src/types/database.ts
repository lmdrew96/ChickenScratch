export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          name: string | null;
          role: 'student' | 'editor' | 'admin';
          created_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          name?: string | null;
          role?: 'student' | 'editor' | 'admin';
          created_at?: string | null;
        };
        Update: {
          email?: string | null;
          name?: string | null;
          role?: 'student' | 'editor' | 'admin';
          created_at?: string | null;
        };
        Relationships: [];
      };
      submissions: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          type: 'writing' | 'visual';
          genre: string | null;
          summary: string | null;
          content_warnings: string | null;
          word_count: number | null;
          text_body: string | null;
          art_files: Json;
          cover_image: string | null;
          status:
            | 'submitted'
            | 'in_review'
            | 'needs_revision'
            | 'accepted'
            | 'declined'
            | 'published';
          assigned_editor: string | null;
          editor_notes: string | null;
          decision_date: string | null;
          published: boolean | null;
          published_url: string | null;
          issue: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          type: 'writing' | 'visual';
          genre?: string | null;
          summary?: string | null;
          content_warnings?: string | null;
          word_count?: number | null;
          text_body?: string | null;
          art_files?: Json;
          cover_image?: string | null;
          status?: Database['public']['Tables']['submissions']['Row']['status'];
          assigned_editor?: string | null;
          editor_notes?: string | null;
          decision_date?: string | null;
          published?: boolean | null;
          published_url?: string | null;
          issue?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          title?: string;
          type?: 'writing' | 'visual';
          genre?: string | null;
          summary?: string | null;
          content_warnings?: string | null;
          word_count?: number | null;
          text_body?: string | null;
          art_files?: Json;
          cover_image?: string | null;
          status?: Database['public']['Tables']['submissions']['Row']['status'];
          assigned_editor?: string | null;
          editor_notes?: string | null;
          decision_date?: string | null;
          published?: boolean | null;
          published_url?: string | null;
          issue?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          submission_id: string;
          action: string;
          details: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          submission_id: string;
          action: string;
          details?: Json | null;
          created_at?: string | null;
        };
        Update: {
          actor_id?: string | null;
          submission_id?: string;
          action?: string;
          details?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_app_role: {
        Args: Record<string, never>;
        Returns: 'student' | 'editor' | 'admin' | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Submission = Database['public']['Tables']['submissions']['Row'];
export type AuditLog = Database['public']['Tables']['audit_log']['Row'];
