import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ledgerEntries } from '@/lib/db/schema';

export type LedgerEntryRow = {
  id: string;
  entry_type: 'expense' | 'income' | 'donation' | string;
  amount: string;
  category: string | null;
  description: string | null;
  entry_date: Date;
  payment_method: string | null;
  purpose_code: string | null;
  is_out_of_pocket: boolean;
  counts_toward_gob: boolean;
  deposited_at: Date | null;
  reimbursement_id: string | null;
  notes: string | null;
  created_at: Date;
};

export async function getRecentLedgerEntries(limit = 20): Promise<LedgerEntryRow[]> {
  const rows = await db()
    .select()
    .from(ledgerEntries)
    .orderBy(desc(ledgerEntries.entry_date))
    .limit(limit);
  return rows as LedgerEntryRow[];
}

export type GobSummary = {
  budgetCents: number;
  spentCents: number;
  remainingCents: number;
  pct: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function getGobSummary(budgetDollars = 400, now: Date = new Date()): Promise<GobSummary> {
  const month = now.getMonth();
  const year = now.getFullYear();
  // Fiscal year: Hen & Ink operates on the academic year. Start Aug 1 of the current or previous calendar year.
  const fyStart = month >= 7 ? new Date(year, 7, 1) : new Date(year - 1, 7, 1);
  const rows = await db()
    .select({ total: sql<string>`COALESCE(SUM(${ledgerEntries.amount}), '0')::text` })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.entry_type, 'expense'),
        eq(ledgerEntries.counts_toward_gob, true),
        gte(ledgerEntries.entry_date, fyStart),
      ),
    );
  const spentCents = Math.round(Number(rows[0]?.total ?? 0) * 100);
  const budgetCents = Math.round(budgetDollars * 100);
  const remainingCents = budgetCents - spentCents;
  const pct = budgetCents > 0 ? Math.min(100, Math.max(0, (spentCents / budgetCents) * 100)) : 0;
  return { budgetCents, spentCents, remainingCents, pct };
}

export type OpenCashDonation = {
  id: string;
  amount: string;
  entry_date: Date;
  description: string | null;
  hoursUntilDeadline: number;
};

export async function getUndepositedCashDonations(now: Date = new Date()): Promise<OpenCashDonation[]> {
  const rows = await db()
    .select()
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.entry_type, 'donation'),
        eq(ledgerEntries.payment_method, 'cash'),
        isNull(ledgerEntries.deposited_at),
      ),
    )
    .orderBy(desc(ledgerEntries.entry_date));
  return rows.map((r) => {
    const deadline = new Date(r.entry_date.getTime() + MS_PER_DAY);
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (60 * 60 * 1000);
    return {
      id: r.id,
      amount: r.amount,
      entry_date: r.entry_date,
      description: r.description,
      hoursUntilDeadline,
    };
  });
}
