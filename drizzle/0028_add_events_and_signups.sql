-- Reusable event signup system. First consumer is the Flock Party potluck;
-- architecture supports any future Hen & Ink event by swapping the slug.

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  location text,
  signups_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_event_date_idx ON events(event_date);

DO $$ BEGIN
  CREATE TYPE signup_category AS ENUM ('sweet', 'savory', 'drink', 'utensils', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS event_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  item text NOT NULL,
  category signup_category NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_signups_event_id_idx ON event_signups(event_id);

-- Prevent one person from double-submitting by changing email casing.
CREATE UNIQUE INDEX IF NOT EXISTS event_signups_event_email_unique
  ON event_signups(event_id, lower(email));

-- Seed the Flock Party 2026 event.
INSERT INTO events (slug, name, description, event_date, location, signups_open)
VALUES (
  'flock-party-2026-05',
  'Flock Party',
  'Our end-of-semester creative celebration! Join the Hen & Ink Society on Friday, May 1 from 5–8pm ET for a potluck, readings, and good company. Bring a dish, drink, or utensils to share.',
  '2026-05-01 17:00:00-04',
  'Lewes Public Library — Large Room',
  true
)
ON CONFLICT (slug) DO NOTHING;
