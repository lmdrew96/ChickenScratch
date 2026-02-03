-- Add clerk_id column to profiles for Clerk authentication mapping
ALTER TABLE profiles ADD COLUMN clerk_id TEXT UNIQUE;

-- Index for fast lookups by clerk_id
CREATE INDEX idx_profiles_clerk_id ON profiles (clerk_id);
