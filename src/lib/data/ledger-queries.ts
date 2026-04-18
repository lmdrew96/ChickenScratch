import { and, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ledgerEntries, upcomingExpenses } from '@/lib/db/schema';
import { getSiteConfigValue } from '@/lib/site-config';

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
  budgetCents: number;        // base allocation from allocation board
  donationsCents: number;     // donations + income that landed in the GOB account
  availableCents: number;     // budget + donations — effective ceiling
  spentCents: number;
  remainingCents: number;     // available - spent
  pct: number;                // spent / available
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function getConfiguredGobBudget(defaultDollars = 400): Promise<number> {
  const raw = await getSiteConfigValue('gob_budget_dollars');
  if (!raw) return defaultDollars;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultDollars;
}

export async function getGobSummary(budgetDollars?: number, now: Date = new Date()): Promise<GobSummary> {
  if (budgetDollars == null) budgetDollars = await getConfiguredGobBudget();
  const month = now.getMonth();
  const year = now.getFullYear();
  // Fiscal year: Hen & Ink operates on the academic year. Start Aug 1 of the current or previous calendar year.
  const fyStart = month >= 7 ? new Date(year, 7, 1) : new Date(year - 1, 7, 1);

  // Donations and other income land in the same UD account as the GOB, so they
  // extend the effective ceiling. Expense entries draw from the combined pot.
  const [spentRows, addedRows] = await Promise.all([
    db()
      .select({ total: sql<string>`COALESCE(SUM(${ledgerEntries.amount}), '0')::text` })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.entry_type, 'expense'),
          eq(ledgerEntries.counts_toward_gob, true),
          gte(ledgerEntries.entry_date, fyStart),
        ),
      ),
    db()
      .select({ total: sql<string>`COALESCE(SUM(${ledgerEntries.amount}), '0')::text` })
      .from(ledgerEntries)
      .where(
        and(
          inArray(ledgerEntries.entry_type, ['donation', 'income']),
          eq(ledgerEntries.counts_toward_gob, true),
          gte(ledgerEntries.entry_date, fyStart),
        ),
      ),
  ]);

  const spentCents = Math.round(Number(spentRows[0]?.total ?? 0) * 100);
  const donationsCents = Math.round(Number(addedRows[0]?.total ?? 0) * 100);
  const budgetCents = Math.round(budgetDollars * 100);
  const availableCents = budgetCents + donationsCents;
  const remainingCents = availableCents - spentCents;
  const pct = availableCents > 0 ? Math.min(100, Math.max(0, (spentCents / availableCents) * 100)) : 0;
  return { budgetCents, donationsCents, availableCents, spentCents, remainingCents, pct };
}

export type UpcomingExpenseRow = {
  id: string;
  description: string;
  amount: string;
  expected_date: Date | null;
  counts_toward_gob: boolean;
  notes: string | null;
  created_at: Date;
};

export async function getUpcomingExpenses(): Promise<UpcomingExpenseRow[]> {
  const rows = await db()
    .select()
    .from(upcomingExpenses)
    .where(isNull(upcomingExpenses.resolved_at))
    .orderBy(sql`${upcomingExpenses.expected_date} ASC NULLS LAST`);
  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    amount: r.amount,
    expected_date: r.expected_date,
    counts_toward_gob: r.counts_toward_gob,
    notes: r.notes,
    created_at: r.created_at,
  }));
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
