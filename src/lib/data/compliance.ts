import { and, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reimbursements } from '@/lib/db/schema';
import { getUndepositedCashDonations, type OpenCashDonation } from './ledger-queries';

export const RECEIPT_RFC_WINDOW_DAYS = 45;
export const RECEIPT_WARN_DAYS = 30;
export const RECEIPT_DANGER_DAYS = 40;
export const CASH_DEPOSIT_HOURS = 24;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ReceiptAgingTone = 'ok' | 'warn' | 'danger' | 'past';

export type ReceiptAgingAlert = {
  id: string;
  description: string;
  amount: string;
  receiptDate: Date;
  daysSinceReceipt: number;
  daysRemaining: number;
  tone: ReceiptAgingTone;
};

function toneFor(days: number): ReceiptAgingTone {
  if (days >= RECEIPT_RFC_WINDOW_DAYS) return 'past';
  if (days >= RECEIPT_DANGER_DAYS) return 'danger';
  if (days >= RECEIPT_WARN_DAYS) return 'warn';
  return 'ok';
}

export async function getReceiptAgingAlerts(now: Date = new Date()): Promise<ReceiptAgingAlert[]> {
  const rows = await db()
    .select({
      id: reimbursements.id,
      description: reimbursements.description,
      amount: reimbursements.amount,
      receipt_date: reimbursements.receipt_date,
      approved_at: reimbursements.approved_at,
    })
    .from(reimbursements)
    .where(
      and(
        isNull(reimbursements.approved_at),
        sql`${reimbursements.receipt_date} IS NOT NULL`,
      ),
    );

  return rows
    .map((r) => {
      const receiptDate = r.receipt_date as Date;
      const daysSinceReceipt = Math.floor((now.getTime() - receiptDate.getTime()) / MS_PER_DAY);
      return {
        id: r.id,
        description: r.description,
        amount: r.amount,
        receiptDate,
        daysSinceReceipt,
        daysRemaining: Math.max(0, RECEIPT_RFC_WINDOW_DAYS - daysSinceReceipt),
        tone: toneFor(daysSinceReceipt),
      };
    })
    .filter((a) => a.tone !== 'ok')
    .sort((a, b) => b.daysSinceReceipt - a.daysSinceReceipt);
}

export type CashDepositAlert = OpenCashDonation & { overdue: boolean };

export async function getCashDepositAlerts(now: Date = new Date()): Promise<CashDepositAlert[]> {
  const open = await getUndepositedCashDonations(now);
  return open.map((d) => ({ ...d, overdue: d.hoursUntilDeadline <= 0 }));
}
