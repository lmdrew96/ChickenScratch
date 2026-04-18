import { desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reimbursements } from '@/lib/db/schema';
import type { ReimbursementRow } from './reimbursement-types';

export type { ReimbursementRow, ReimbursementStage } from './reimbursement-types';
export { currentStage, stageTransitionDate } from './reimbursement-types';

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
