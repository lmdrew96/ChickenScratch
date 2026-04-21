-- Performance roster signups for events. Distinct from potluck (event_signups)
-- because the schema differs: piece title, performer kind, estimated duration,
-- optional content warnings. Open-mic semantics — no unique constraint on email.

DO $$ BEGIN
  CREATE TYPE performance_kind AS ENUM ('poetry', 'storytelling', 'one_act_play');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS event_performance_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  kind performance_kind NOT NULL,
  piece_title text NOT NULL,
  estimated_minutes integer NOT NULL CHECK (estimated_minutes BETWEEN 1 AND 15),
  content_warnings text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_performance_signups_event_id_idx
  ON event_performance_signups(event_id);

-- Refresh the Flock Party description now that the page hosts both signups.
UPDATE events
SET description = 'Our end-of-semester creative celebration! Join the Hen & Ink Society on Friday, May 1 from 5–8pm ET for a potluck and an open mic. Bring a dish to share, sign up to read a poem, tell a story, or stage a one-act play — or just come hang out.',
    updated_at = now()
WHERE slug = 'flock-party-2026-05';
