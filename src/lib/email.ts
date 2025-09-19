import type { Submission } from '@/types/database';

type Template = 'needs_revision' | 'accepted' | 'declined';

type EmailPayload = {
  template: Template;
  to: string;
  submission: Pick<Submission, 'id' | 'title'>;
  editorNotes?: string | null;
};

const SUBJECTS: Record<Template, string> = {
  needs_revision: 'Chicken Scratch submission needs revision',
  accepted: 'Chicken Scratch submission accepted',
  declined: 'Chicken Scratch submission update',
};

export async function sendSubmissionEmail({ template, to, submission, editorNotes }: EmailPayload) {
  const subject = SUBJECTS[template];
  const payload = {
    to,
    subject,
    submission,
    editorNotes,
  };

  // For local development we log to console. Replace with Resend/SendGrid in production.
  console.info('[email:stub]', template, payload);

  return { success: true } as const;
}
