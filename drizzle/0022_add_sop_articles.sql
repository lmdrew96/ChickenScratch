-- SOP library infrastructure (toolkit overhaul §9).
-- Per-role markdown knowledge hub that survives officer turnover.

CREATE TABLE IF NOT EXISTS sop_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_slug text NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  body_md text NOT NULL DEFAULT '',
  tags text[] DEFAULT ARRAY[]::text[],
  is_draft boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_slug, slug)
);

CREATE INDEX IF NOT EXISTS sop_articles_role_slug_idx ON sop_articles(role_slug);
