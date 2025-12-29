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
          full_name: string | null;
          avatar_url: string | null;
          pronouns: string | null;
          role: 'student' | 'editor' | 'admin' | 'bbeg' | 'dictator_in_chief' | 'scroll_gremlin' | 'chief_hoarder' | 'pr_nightmare' | 'editor_in_chief' | 'submissions_coordinator' | 'proofreader' | 'lead_design' | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          name?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          pronouns?: string | null;
          role?: 'student' | 'editor' | 'admin' | 'bbeg' | 'dictator_in_chief' | 'scroll_gremlin' | 'chief_hoarder' | 'pr_nightmare' | 'editor_in_chief' | 'submissions_coordinator' | 'proofreader' | 'lead_design' | null;
          updated_at?: string | null;
        };
        Update: {
          email?: string | null;
          name?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          pronouns?: string | null;
          role?: 'student' | 'editor' | 'admin' | 'bbeg' | 'dictator_in_chief' | 'scroll_gremlin' | 'chief_hoarder' | 'pr_nightmare' | 'editor_in_chief' | 'submissions_coordinator' | 'proofreader' | 'lead_design' | null;
          updated_at?: string | null;
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
          file_url: string | null;
          file_name: string | null;
          file_type: string | null;
          file_size: number | null;
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
          // Committee workflow fields
          committee_status: 'pending_coordinator' | 'with_coordinator' | 'coordinator_approved' | 'coordinator_declined' | 'with_proofreader' | 'proofreader_committed' | 'with_lead_design' | 'lead_design_committed' | 'with_editor_in_chief' | 'editor_approved' | 'editor_declined' | 'final_committee_review' | null;
          google_docs_link: string | null;
          lead_design_commit_link: string | null;
          committee_comments: Json;
          workflow_step: string | null;
          decline_reason: string | null;
          original_files: Json;
          current_version: number | null;
          version_history: Json;
          assigned_coordinator: string | null;
          assigned_proofreader: string | null;
          assigned_lead_design: string | null;
          assigned_editor_in_chief: string | null;
          coordinator_reviewed_at: string | null;
          proofreader_committed_at: string | null;
          lead_design_committed_at: string | null;
          editor_reviewed_at: string | null;
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
          file_url?: string | null;
          file_name?: string | null;
          file_type?: string | null;
          file_size?: number | null;
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
          // Committee workflow fields
          committee_status?: Database['public']['Tables']['submissions']['Row']['committee_status'];
          google_docs_link?: string | null;
          lead_design_commit_link?: string | null;
          committee_comments?: Json;
          workflow_step?: string | null;
          decline_reason?: string | null;
          original_files?: Json;
          current_version?: number | null;
          version_history?: Json;
          assigned_coordinator?: string | null;
          assigned_proofreader?: string | null;
          assigned_lead_design?: string | null;
          assigned_editor_in_chief?: string | null;
          coordinator_reviewed_at?: string | null;
          proofreader_committed_at?: string | null;
          lead_design_committed_at?: string | null;
          editor_reviewed_at?: string | null;
        };
        Update: {
          title?: string;
          type?: 'writing' | 'visual';
          genre?: string | null;
          summary?: string | null;
          content_warnings?: string | null;
          word_count?: number | null;
          text_body?: string | null;
          file_url?: string | null;
          file_name?: string | null;
          file_type?: string | null;
          file_size?: number | null;
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
          // Committee workflow fields
          committee_status?: Database['public']['Tables']['submissions']['Row']['committee_status'];
          google_docs_link?: string | null;
          lead_design_commit_link?: string | null;
          committee_comments?: Json;
          workflow_step?: string | null;
          decline_reason?: string | null;
          original_files?: Json;
          current_version?: number | null;
          version_history?: Json;
          assigned_coordinator?: string | null;
          assigned_proofreader?: string | null;
          assigned_lead_design?: string | null;
          assigned_editor_in_chief?: string | null;
          coordinator_reviewed_at?: string | null;
          proofreader_committed_at?: string | null;
          lead_design_committed_at?: string | null;
          editor_reviewed_at?: string | null;
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
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          is_member: boolean;
          roles: ('officer' | 'committee')[];
          positions: ('BBEG' | 'Dictator-in-Chief' | 'Scroll Gremlin' | 'Chief Hoarder' | 'PR Nightmare' | 'Submissions Coordinator' | 'Proofreader' | 'Lead Design' | 'Editor-in-Chief')[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          is_member?: boolean;
          roles?: ('officer' | 'committee')[];
          positions?: ('BBEG' | 'Dictator-in-Chief' | 'Scroll Gremlin' | 'Chief Hoarder' | 'PR Nightmare' | 'Submissions Coordinator' | 'Proofreader' | 'Lead Design' | 'Editor-in-Chief')[];
          created_at?: string;
        };
        Update: {
          user_id?: string;
          is_member?: boolean;
          roles?: ('officer' | 'committee')[];
          positions?: ('BBEG' | 'Dictator-in-Chief' | 'Scroll Gremlin' | 'Chief Hoarder' | 'PR Nightmare' | 'Submissions Coordinator' | 'Proofreader' | 'Lead Design' | 'Editor-in-Chief')[];
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_app_role: {
        Args: Record<string, never>;
        Returns: 'student' | 'editor' | 'admin' | 'bbeg' | 'dictator_in_chief' | 'scroll_gremlin' | 'chief_hoarder' | 'pr_nightmare' | 'editor_in_chief' | 'submissions_coordinator' | 'proofreader' | 'lead_design' | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Submission = Database['public']['Tables']['submissions']['Row'];
export type AuditLog = Database['public']['Tables']['audit_log']['Row'];

// Published submission types for the public gallery
export type PublishedSubmissionRow = Pick<
  Submission,
  | 'id'
  | 'title'
  | 'summary'
  | 'type'
  | 'cover_image'
  | 'published_url'
  | 'issue'
  | 'art_files'
  | 'updated_at'
  | 'created_at'
>;

export type PublishedSubmission = Omit<PublishedSubmissionRow, 'art_files'> & {
  art_files: string[];
  coverSignedUrl: string | null;
};

export type PublishedDetailRow = Pick<
  Submission,
  | 'id'
  | 'title'
  | 'summary'
  | 'type'
  | 'cover_image'
  | 'content_warnings'
  | 'art_files'
  | 'text_body'
  | 'published_url'
  | 'issue'
  | 'updated_at'
>;
