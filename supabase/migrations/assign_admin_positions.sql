-- Assign Dictator-in-Chief and Editor-in-Chief positions to admin user
-- This script should be run after the user_roles table is set up

-- First, ensure the admin user exists in user_roles table
-- Replace 'ADMIN_USER_ID' with the actual UUID of your admin user

-- Example: To find your admin user ID, you can run:
-- SELECT id, email FROM auth.users WHERE email = 'your-admin-email@example.com';

-- Then update this script with the actual user ID and run it:

-- INSERT INTO user_roles (user_id, is_member, roles, positions)
-- VALUES (
--   'YOUR_ADMIN_USER_ID_HERE'::uuid,
--   true,
--   ARRAY['officer']::TEXT[],
--   ARRAY['Dictator-in-Chief', 'Editor-in-Chief']::TEXT[]
-- )
-- ON CONFLICT (user_id) 
-- DO UPDATE SET
--   is_member = true,
--   roles = ARRAY['officer']::TEXT[],
--   positions = ARRAY['Dictator-in-Chief', 'Editor-in-Chief']::TEXT[];

-- Alternative: Update existing user_roles entry if it already exists
-- UPDATE user_roles 
-- SET 
--   is_member = true,
--   roles = ARRAY['officer']::TEXT[],
--   positions = ARRAY['Dictator-in-Chief', 'Editor-in-Chief']::TEXT[]
-- WHERE user_id = 'YOUR_ADMIN_USER_ID_HERE'::uuid;

-- Note: This is a template. You need to:
-- 1. Find your admin user's UUID from auth.users table
-- 2. Uncomment and update one of the queries above with the actual UUID
-- 3. Run the migration
