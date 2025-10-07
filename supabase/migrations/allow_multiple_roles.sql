-- Allow users to have both officer and committee roles simultaneously
-- Changes the 'role' column from a single value to an array

-- Step 1: Add new columns for the array-based approach
ALTER TABLE user_roles 
ADD COLUMN roles TEXT[] DEFAULT '{}';

-- Step 2: Migrate existing data from single 'role' to 'roles' array
UPDATE user_roles 
SET roles = ARRAY[role]::TEXT[]
WHERE role IS NOT NULL;

-- Step 3: Drop the old single-value role column
ALTER TABLE user_roles 
DROP COLUMN role;

-- Step 4: Add a check constraint to ensure valid role values
ALTER TABLE user_roles
ADD CONSTRAINT valid_roles CHECK (
  roles <@ ARRAY['officer', 'committee']::TEXT[]
);

-- Step 5: Create a helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION user_has_role(user_roles_row user_roles, role_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN role_to_check = ANY(user_roles_row.roles);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6: Create a helper function to check if user is officer
CREATE OR REPLACE FUNCTION is_officer(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_id_param 
    AND 'officer' = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create a helper function to check if user is committee member
CREATE OR REPLACE FUNCTION is_committee(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_id_param 
    AND 'committee' = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Users can now have roles like:
-- - ['officer'] - Officer only
-- - ['committee'] - Committee only  
-- - ['officer', 'committee'] - Both roles
-- - [] - No roles (but still a member if is_member = true)
