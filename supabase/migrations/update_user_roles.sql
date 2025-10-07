-- Drop the existing table if it exists
DROP TABLE IF EXISTS user_roles;

-- Create the user_roles table with Supabase auth UUID
CREATE TABLE user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_member BOOLEAN DEFAULT false,
  role TEXT CHECK (role IN ('officer', 'committee') OR role IS NULL),
  position TEXT CHECK (
    position IN (
      'BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 
      'Chief Hoarder', 'PR Nightmare',
      'Submissions Coordinator', 'Proofreader', 
      'Lead Design', 'Editor-in-Chief'
    ) OR position IS NULL
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all roles
CREATE POLICY "Public read access" ON user_roles
  FOR SELECT USING (true);

-- Policy: Only admins can update roles
CREATE POLICY "Admin update access" ON user_roles
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE position IN ('BBEG', 'Dictator-in-Chief')
    )
  );
