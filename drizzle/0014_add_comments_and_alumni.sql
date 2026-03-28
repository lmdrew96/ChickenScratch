-- Add alumni status to user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS is_alumni boolean DEFAULT false NOT NULL;

-- Comments table for published works and zine issues
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS comments_target_idx ON comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS comments_author_id_idx ON comments(author_id);
