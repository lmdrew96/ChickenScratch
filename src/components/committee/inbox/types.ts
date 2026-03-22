import type { Submission } from '@/types/database';

export type CommitteeRole =
  | 'submissions_coordinator'
  | 'proofreader'
  | 'lead_design'
  | 'editor_in_chief'
  | 'student';

export type InboxSectionId = 'action_required' | 'waiting' | 'done' | 'all';

export type InboxNextActionId =
  | 'start_review'
  | 'review'
  | 'approve'
  | 'request_changes'
  | 'decline'
  | 'open_proofread_editor'
  | 'commit_proofread'
  | 'add_canva_link'
  | 'open_canva_link'
  | 'commit_canva_link'
  | 'final_approve'
  | 'final_decline'
  | 'none';

export type InboxActionVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export type InboxAction = {
  id: InboxNextActionId;
  label: string;
  variant: InboxActionVariant;
  /** This maps directly to /api/committee-workflow action */
  workflowAction?:
    | 'review'
    | 'approve'
    | 'decline'
    | 'commit'
    | 'assign'
    | 'final_approve'
    | 'final_decline'
    | 'request_changes';
  /** Whether we must prompt for a URL to complete this action */
  requiresLinkUrl?: 'canva_link';
  /** Whether we must prompt for a comment */
  requiresComment?: boolean;
};

export type InboxItem = {
  submission: Submission;
  section: InboxSectionId;
  /** Human-friendly primary instruction like "Review" or "Add Google Doc" */
  nextActionLabel: string;
  nextActionId: InboxNextActionId;
  /** Used for sorting within a section; higher means more urgent */
  priority: number;
  /** Primary CTA used in list rows (optional). Full action set shown in detail sheet. */
  primaryAction?: InboxAction;
  /** All actions available for this item in the detail sheet */
  actions: InboxAction[];
  statusLabel: string;
};

