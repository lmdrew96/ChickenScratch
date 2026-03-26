CREATE TABLE IF NOT EXISTS zine_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  volume INTEGER,
  issue_number INTEGER,
  publish_date TIMESTAMP WITH TIME ZONE,
  issuu_embed TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS zine_issues_is_published_idx ON zine_issues (is_published);
