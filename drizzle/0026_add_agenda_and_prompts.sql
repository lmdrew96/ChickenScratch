-- President agenda builder + prompt archive (toolkit overhaul §13).

CREATE TABLE IF NOT EXISTS meeting_agendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid UNIQUE NOT NULL REFERENCES meeting_proposals(id) ON DELETE CASCADE,
  draft_md text NOT NULL DEFAULT '',
  finalized_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS creative_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  tags text[] DEFAULT ARRAY[]::text[],
  first_used_at timestamptz,
  last_used_at timestamptz,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creative_prompts_last_used_at_idx ON creative_prompts(last_used_at);
