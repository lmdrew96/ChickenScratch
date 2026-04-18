-- Treasurer reimbursement pipeline (toolkit overhaul §5).
-- Tracks the real UD RSO reimbursement flow:
--   Submitted -> Approved -> Check received -> Ledgered
-- The "Ledgered" stage can only be reached after a check_number is recorded
-- (the university emails a check number when the payment is cut).

CREATE TABLE IF NOT EXISTS reimbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  receipt_date timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  check_received_at timestamptz,
  check_number text,
  ledgered_at timestamptz,
  ledger_entry_id uuid,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reimbursements_ledgered_at_idx ON reimbursements(ledgered_at);
CREATE INDEX IF NOT EXISTS reimbursements_submitted_at_idx ON reimbursements(submitted_at);
