-- Stateful recurring task checkboxes (toolkit overhaul §2).
-- Tracks per-user completion of recurring officer tasks within a cadence bucket ("cycle_key").
-- Stale buckets (prior week/month/etc.) are effectively reset because queries filter on
-- the current cycle_key computed by the app.

CREATE TABLE IF NOT EXISTS recurring_task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id text NOT NULL,
  cycle_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id, cycle_key)
);

CREATE INDEX IF NOT EXISTS recurring_task_completions_user_cycle_idx
  ON recurring_task_completions(user_id, cycle_key);
