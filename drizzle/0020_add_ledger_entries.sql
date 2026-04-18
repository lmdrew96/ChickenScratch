-- Treasurer ledger (toolkit overhaul §8).
-- Single table carrying expenses, income, and donations. Cash donations need
-- a 24-hour deposit ceremony (§6), so deposited_at lives here rather than on
-- a parallel cash_donations table.

CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type text NOT NULL, -- 'expense' | 'income' | 'donation'
  amount numeric(10, 2) NOT NULL,
  category text,
  description text,
  entry_date timestamptz NOT NULL DEFAULT now(),
  payment_method text, -- 'cash' | 'check' | 'card' | 'venmo' | 'other'
  purpose_code text,
  is_out_of_pocket boolean NOT NULL DEFAULT false,
  counts_toward_gob boolean NOT NULL DEFAULT true,
  deposited_at timestamptz, -- for cash donations only
  reimbursement_id uuid REFERENCES reimbursements(id) ON DELETE SET NULL,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ledger_entries_entry_date_idx ON ledger_entries(entry_date);
CREATE INDEX IF NOT EXISTS ledger_entries_type_idx ON ledger_entries(entry_type);
