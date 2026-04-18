import { desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reimbursements } from '@/lib/db/schema';

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

export type ReimbursementStage = 'submitted' | 'approved' | 'check_received' | 'ledgered';

export function currentStage(r: ReimbursementRow): ReimbursementStage {
  if (r.ledgered_at) return 'ledgered';
  if (r.check_received_at) return 'check_received';
  if (r.approved_at) return 'approved';
  return 'submitted';
}

export function stageTransitionDate(r: ReimbursementRow): Date {
  return r.ledgered_at ?? r.check_received_at ?? r.approved_at ?? r.submitted_at;
}

export async function getOpenReimbursements(): Promise<ReimbursementRow[]> {
  const rows = await db()
    .select()
    .from(reimbursements)
    .orderBy(desc(reimbursements.submitted_at));
  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    amount: r.amount,
    receipt_date: r.receipt_date,
    submitted_at: r.submitted_at,
    approved_at: r.approved_at,
    check_received_at: r.check_received_at,
    check_number: r.check_number,
    ledgered_at: r.ledgered_at,
    notes: r.notes,
    created_at: r.created_at,
  }));
}
