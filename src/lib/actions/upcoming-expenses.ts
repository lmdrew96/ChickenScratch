'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { upcomingExpenses } from '@/lib/db/schema';
import { requireOfficerRole } from '@/lib/auth/guards';
import { getCurrentUserRole } from './roles';

async function ensureTreasurerOrAdmin(): Promise<{ userId: string } | { error: string }> {
  const { profile } = await requireOfficerRole();
  const role = await getCurrentUserRole();
  const allowed =
    role?.positions?.some((p) => p === 'Dictator-in-Chief' || p === 'Scroll Gremlin') ?? false;
  if (!allowed) return { error: 'Only treasurer/admin can manage upcoming expenses.' };
  return { userId: profile.id };
}

function revalidateTreasurer() {
  revalidatePath('/officers/toolkits/treasurer');
}

export async function addUpcomingExpense(input: {
  description: string;
  amount: number;
  expected_date?: string;
  counts_toward_gob?: boolean;
  notes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const guard = await ensureTreasurerOrAdmin();
    if ('error' in guard) return { ok: false, error: guard.error };
    if (!input.description?.trim()) return { ok: false, error: 'Description required' };
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, error: 'Amount must be > 0' };
    }
    await db().insert(upcomingExpenses).values({
      description: input.description.trim(),
      amount: input.amount.toFixed(2),
      expected_date: input.expected_date ? new Date(input.expected_date) : null,
      counts_toward_gob: input.counts_toward_gob ?? true,
      notes: input.notes?.trim() || null,
      created_by: guard.userId,
    });
    revalidateTreasurer();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function resolveUpcomingExpense(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const guard = await ensureTreasurerOrAdmin();
    if ('error' in guard) return { ok: false, error: guard.error };
    await db()
      .update(upcomingExpenses)
      .set({ resolved_at: new Date() })
      .where(eq(upcomingExpenses.id, id));
    revalidateTreasurer();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteUpcomingExpense(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const guard = await ensureTreasurerOrAdmin();
    if ('error' in guard) return { ok: false, error: guard.error };
    await db().delete(upcomingExpenses).where(eq(upcomingExpenses.id, id));
    revalidateTreasurer();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}
