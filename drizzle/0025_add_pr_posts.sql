-- PR content calendar (toolkit overhaul §12).
-- Each row represents a single M/W/F slot or ad-hoc post.

CREATE TABLE IF NOT EXISTS pr_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'empty', -- 'empty' | 'drafted' | 'scheduled' | 'posted'
  title text,
  draft_text text,
  channels text[] DEFAULT ARRAY[]::text[],
  attachments jsonb DEFAULT '[]'::jsonb,
  template text,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pr_posts_scheduled_for_idx ON pr_posts(scheduled_for);
