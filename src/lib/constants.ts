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

export const EDITABLE_STATUSES: SubmissionStatus[] = ['submitted', 'needs_revision'];

export function formatStatus(status: SubmissionStatus) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
