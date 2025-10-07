-- Production-ready fix for user_roles RLS policies
-- This removes infinite recursion and implements proper security

-- Drop all existing policies
DROP POLICY IF EXISTS "Public read access" ON user_roles;
DROP POLICY IF EXISTS "Admin update access" ON user_roles;
DROP POLICY IF EXISTS "Users can update own role" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
DROP POLICY IF EXISTS "Users can delete own role" ON user_roles;

-- Policy 1: Anyone can read all roles (needed for displaying member info)
CREATE POLICY "Anyone can read roles" ON user_roles
  FOR SELECT USING (true);

-- Policy 2: Only service role can insert/update/delete roles
-- This means all role management MUST go through your server-side code
-- using the service role key, not the anon key
CREATE POLICY "Service role only for modifications" ON user_roles
  FOR ALL USING (
    -- This will only be true when using the service role key
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Note: With this setup:
-- 1. Anyone can READ roles (for displaying member lists, checking permissions, etc.)
-- 2. Only your server-side code using the service role key can MODIFY roles
-- 3. No infinite recursion because we're not querying user_roles in the policy
-- 4. Your application code (using service role) handles all admin checks
