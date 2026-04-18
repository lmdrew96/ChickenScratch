export type ReimbursementStage = 'submitted' | 'approved' | 'check_received' | 'ledgered';

export type ReimbursementRow = {
  id: string;
  description: string;
  amount: string;
  receipt_date: Date | null;
  submitted_at: Date;
  approved_at: Date | null;
  check_received_at: Date | null;
  check_number: string | null;
  ledgered_at: Date | null;
  notes: string | null;
  created_at: Date;
};

export function currentStage(r: ReimbursementRow): ReimbursementStage {
  if (r.ledgered_at) return 'ledgered';
  if (r.check_received_at) return 'check_received';
  if (r.approved_at) return 'approved';
  return 'submitted';
}

export function stageTransitionDate(r: ReimbursementRow): Date {
  return r.ledgered_at ?? r.check_received_at ?? r.approved_at ?? r.submitted_at;
}
