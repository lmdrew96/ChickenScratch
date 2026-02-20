export const SUBMISSION_TYPES = ['writing', 'visual'] as const;
export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

export const SUBMISSION_STATUSES = [
  'submitted',
  'in_review',
  'needs_revision',
  'accepted',
  'declined',
  'published',
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const EDITABLE_STATUSES: readonly string[] = ['needs_revision'];

export const COMMITTEE_STATUSES = [
  'pending_coordinator',
  'with_coordinator',
  'coordinator_approved',
  'coordinator_declined',
  'changes_requested',
  'proofreader_committed',
  'lead_design_committed',
  'editor_approved',
  'editor_declined',
] as const;
export type CommitteeStatus = (typeof COMMITTEE_STATUSES)[number];

export function isSubmissionStatus(value: string | null | undefined): value is SubmissionStatus {
  return typeof value === 'string' && (SUBMISSION_STATUSES as readonly string[]).includes(value);
}

export function formatStatus(status: string | null) {
  if (!status) return 'Unknown';
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
