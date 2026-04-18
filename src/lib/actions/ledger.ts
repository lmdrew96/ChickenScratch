'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { ledgerEntries } from '@/lib/db/schema';
import { requireOfficerRole } from '@/lib/auth/guards';
import { getCurrentUserRole } from './roles';

export type LedgerEntryType = 'expense' | 'income' | 'donation';
export type PaymentMethod = 'cash' | 'check' | 'card' | 'venmo' | 'other';

async function ensureTreasurerOrAdmin(): Promise<{ userId: string } | { error: string }> {
  const { profile } = await requireOfficerRole();
  const role = await getCurrentUserRole();
  const allowed =
    role?.positions?.some((p) => p === 'Dictator-in-Chief' || p === 'Scroll Gremlin') ?? false;
  if (!allowed) return { error: 'Only treasurer/admin can record ledger entries.' };
  return { userId: profile.id };
}

function revalidateTreasurer() {
  revalidatePath('/officers/toolkits/treasurer');
}

export async function createLedgerEntry(input: {
  entry_type: LedgerEntryType;
  amount: number;
  description?: string;
  category?: string;
  entry_date?: string;
  payment_method?: PaymentMethod;
  purpose_code?: string;
  is_out_of_pocket?: boolean;
  counts_toward_gob?: boolean;
  notes?: string;
  reimbursement_id?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const guard = await ensureTreasurerOrAdmin();
    if ('error' in guard) return { ok: false, error: guard.error };
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, error: 'Amount must be > 0' };
    }
    if (!['expense', 'income', 'donation'].includes(input.entry_type)) {
      return { ok: false, error: 'Invalid entry type' };
    }
    const entryDate = input.entry_date ? new Date(input.entry_date) : new Date();

    const [row] = await db()
      .insert(ledgerEntries)
      .values({
        entry_type: input.entry_type,
        amount: input.amount.toFixed(2),
        description: input.description?.trim() || null,
        category: input.category?.trim() || null,
        entry_date: entryDate,
        payment_method: input.payment_method ?? null,
        purpose_code: input.purpose_code?.trim() || null,
        is_out_of_pocket: input.is_out_of_pocket ?? false,
        counts_toward_gob: input.counts_toward_gob ?? true,
        notes: input.notes?.trim() || null,
        reimbursement_id: input.reimbursement_id || null,
        created_by: guard.userId,
      })
      .returning({ id: ledgerEntries.id });
    revalidateTreasurer();
    return { ok: true, id: row!.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function updateLedgerEntry(input: {
  id: string;
  entry_type: LedgerEntryType;
  amount: number;
  description?: string;
  category?: string;
  entry_date?: string;
  payment_method?: PaymentMethod;
  purpose_code?: string;
  is_out_of_pocket?: boolean;
  counts_toward_gob?: boolean;
  notes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const guard = await ensureTreasurerOrAdmin();
    if ('error' in guard) return { ok: false, error: guard.error };
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, error: 'Amount must be > 0' };
    }
    if (!['expense', 'income', 'donation'].includes(input.entry_type)) {
      return { ok: false, error: 'Invalid entry type' };
    }
    await db()
      .update(ledgerEntries)
      .set({
        entry_type: input.entry_type,
        amount: input.amount.toFixed(2),
        description: input.description?.trim() || null,
        category: input.category?.trim() || null,
        entry_date: input.entry_date ? new Date(input.entry_date) : undefined,
        payment_method: input.payment_method ?? null,
        purpose_code: input.purpose_code?.trim() || null,
        is_out_of_pocket: input.is_out_of_pocket ?? false,
        counts_toward_gob: input.counts_toward_gob ?? true,
        notes: input.notes?.trim() || null,
      })
      .where(eq(ledgerEntries.id, input.id));
    revalidateTreasurer();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function markCashDonationDeposited(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const guard = await ensureTreasurerOrAdmin();
    if ('error' in guard) return { ok: false, error: guard.error };
    await db()
      .update(ledgerEntries)
      .set({ deposited_at: new Date() })
      .where(eq(ledgerEntries.id, id));
    revalidateTreasurer();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteLedgerEntry(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const guard = await ensureTreasurerOrAdmin();
    if ('error' in guard) return { ok: false, error: guard.error };
    await db().delete(ledgerEntries).where(eq(ledgerEntries.id, id));
    revalidateTreasurer();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}
