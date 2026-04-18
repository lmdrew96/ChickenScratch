'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { reimbursements } from '@/lib/db/schema';
import { requireOfficerRole } from '@/lib/auth/guards';
import { getCurrentUserRole } from './roles';

const TREASURER_POSITIONS = ['Dictator-in-Chief'] as const;

async function ensureTreasurer(): Promise<{ userId: string } | { error: string }> {
  const { profile } = await requireOfficerRole();
  const role = await getCurrentUserRole();
  const isTreasurer =
    role?.positions?.some((p) => (TREASURER_POSITIONS as readonly string[]).includes(p)) ?? false;
  const isAdmin = role?.positions?.some((p) => p === 'Dictator-in-Chief' || p === 'Scroll Gremlin') ?? false;
  if (!isTreasurer && !isAdmin) return { error: 'Only treasurers can manage reimbursements.' };
  return { userId: profile.id };
}

export type ReimbursementStage = 'submitted' | 'approved' | 'check_received' | 'ledgered';

function revalidateTreasurer() {
  revalidatePath('/officers/toolkits/treasurer');
  revalidatePath('/officers');
}

export async function createReimbursement(input: {
  description: string;
  amount: number;
  receipt_date?: string | null;
  notes?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const guard = await ensureTreasurer();
    if ('error' in guard) return { ok: false, error: guard.error };
    if (!input.description?.trim()) return { ok: false, error: 'Description required' };
    if (!Number.isFinite(input.amount) || input.amount <= 0) return { ok: false, error: 'Amount must be > 0' };

    await db().insert(reimbursements).values({
      description: input.description.trim(),
      amount: input.amount.toFixed(2),
      receipt_date: input.receipt_date ? new Date(input.receipt_date) : null,
      notes: input.notes?.trim() || null,
      created_by: guard.userId,
    });
    revalidateTreasurer();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function advanceReimbursementStage(input: {
  id: string;
  target: ReimbursementStage;
  check_number?: string;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const guard = await ensureTreasurer();
    if ('error' in guard) return { ok: false, error: guard.error };

    const database = db();
    const existing = await database
      .select()
      .from(reimbursements)
      .where(eq(reimbursements.id, input.id))
      .limit(1);
    if (!existing[0]) return { ok: false, error: 'Reimbursement not found' };
    const row = existing[0];

    const now = new Date();
    const patch: Partial<typeof reimbursements.$inferInsert> = {};
    if (input.note) patch.notes = [row.notes, input.note].filter(Boolean).join('\n');

    switch (input.target) {
      case 'submitted':
        if (!row.submitted_at) patch.submitted_at = now;
        break;
      case 'approved':
        if (!row.submitted_at) return { ok: false, error: 'Must be submitted before approval' };
        patch.approved_at = now;
        break;
      case 'check_received': {
        if (!row.approved_at) return { ok: false, error: 'Must be approved before check arrives' };
        const cn = input.check_number?.trim();
        if (!cn) return { ok: false, error: 'Check number is required at this stage' };
        patch.check_received_at = now;
        patch.check_number = cn;
        break;
      }
      case 'ledgered':
        if (!row.check_received_at || !row.check_number) {
          return { ok: false, error: 'A check number must be recorded before ledgering' };
        }
        patch.ledgered_at = now;
        break;
    }

    await database.update(reimbursements).set(patch).where(eq(reimbursements.id, input.id));
    revalidateTreasurer();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Advance failed' };
  }
}

export async function deleteReimbursement(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const guard = await ensureTreasurer();
    if ('error' in guard) return { ok: false, error: guard.error };
    await db().delete(reimbursements).where(eq(reimbursements.id, id));
    revalidateTreasurer();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}
