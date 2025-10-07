-- Fix the infinite recursion in user_roles RLS policies

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admin update access" ON user_roles;

-- Create a simpler policy that allows authenticated users to update their own role
-- (This is temporary - in production you'd want a more secure approach)
CREATE POLICY "Users can update own role" ON user_roles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create a policy for inserting new roles (authenticated users can create their own)
CREATE POLICY "Users can insert own role" ON user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create a policy for deleting (only allow users to delete their own role)
CREATE POLICY "Users can delete own role" ON user_roles
  FOR DELETE USING (auth.uid() = user_id);

-- Note: For a production system, you would want to:
-- 1. Create a separate admin_users table or use Supabase's custom claims
-- 2. Use a service role key for admin operations
-- 3. Implement admin checks in your application layer, not in RLS policies
