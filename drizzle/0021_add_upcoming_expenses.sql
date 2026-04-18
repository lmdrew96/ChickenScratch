-- Treasurer GOB budget tracker (toolkit overhaul §7).
-- Captures "planned but not yet spent" expenses so the GOB tracker can warn
-- when projected total exceeds remaining budget. Resolved rows drop out of
-- the warning list but remain for historical reference.

CREATE TABLE IF NOT EXISTS upcoming_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  expected_date timestamptz,
  counts_toward_gob boolean NOT NULL DEFAULT true,
  notes text,
  resolved_at timestamptz,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS upcoming_expenses_resolved_at_idx ON upcoming_expenses(resolved_at);
