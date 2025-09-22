export const SUBMISSION_TYPES = [
  'poetry','poem','fiction','short_story','nonfiction','essay',
  'drama','script','art','visual_art','photography','comics','comic','audio','other'
] as const;
export type SubmissionType = typeof SUBMISSION_TYPES[number];
export const SUBMISSION_STATUSES = [
  'draft','submitted','under_review','needs_revision','approved',
  'not_started','content_review','copy_edit','layout','ready_to_publish','published','declined','withdrawn'
] as const;
export type SubmissionStatus = typeof SUBMISSION_STATUSES[number];
export const EDITABLE_STATUSES: SubmissionStatus[] = ['draft','needs_revision','declined'];
export function formatStatus(s:string):string{
  const map:Record<string,string> = {
    draft:'Draft',submitted:'Submitted',under_review:'Under Review',needs_revision:'Needs Revision',approved:'Approved',
    not_started:'Not Started',content_review:'Content Review',copy_edit:'Copy Edit',layout:'Layout',
    ready_to_publish:'Ready to Publish',published:'Published',declined:'Declined',withdrawn:'Withdrawn'
  };
  if (map[s]) return map[s];
  return String(s).replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[-_]+/g,' ').replace(/s+/g,' ').trim().replace(/w/g,c=>c.toUpperCase());
}
export const ROLES = ['student','editor','admin'] as const;
export const WORKFLOW_STAGES = ['not_started','content_review','copy_edit','layout','ready_to_publish','published','declined'] as const;
export const DEFAULT_PAGE_SIZE = 50;
