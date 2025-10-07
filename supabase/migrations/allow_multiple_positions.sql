-- Allow users to have multiple positions simultaneously
-- Changes the 'position' column from a single value to an array

-- Step 1: Add new column for the array-based approach
ALTER TABLE user_roles 
ADD COLUMN positions TEXT[] DEFAULT '{}';

-- Step 2: Migrate existing data from single 'position' to 'positions' array
UPDATE user_roles 
SET positions = ARRAY[position]::TEXT[]
WHERE position IS NOT NULL;

-- Step 3: Drop the old single-value position column
ALTER TABLE user_roles 
DROP COLUMN position;

-- Step 4: Add a check constraint to ensure valid position values
ALTER TABLE user_roles
ADD CONSTRAINT valid_positions CHECK (
  positions <@ ARRAY[
    'BBEG', 
    'Dictator-in-Chief', 
    'Scroll Gremlin', 
    'Chief Hoarder', 
    'PR Nightmare',
    'Submissions Coordinator', 
    'Proofreader', 
    'Lead Design', 
    'Editor-in-Chief'
  ]::TEXT[]
);

-- Step 5: Create a helper function to check if user has a specific position
CREATE OR REPLACE FUNCTION user_has_position(user_roles_row user_roles, position_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN position_to_check = ANY(user_roles_row.positions);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6: Create a helper function to check if user is admin (has BBEG or Dictator-in-Chief)
CREATE OR REPLACE FUNCTION is_admin_position(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_id_param 
    AND ('BBEG' = ANY(positions) OR 'Dictator-in-Chief' = ANY(positions))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Users can now have positions like:
-- - ['Dictator-in-Chief'] - Single position
-- - ['BBEG', 'Scroll Gremlin'] - Multiple officer positions
-- - ['Submissions Coordinator', 'Proofreader'] - Multiple committee positions
-- - ['Dictator-in-Chief', 'Submissions Coordinator'] - Mix of officer and committee positions
-- - [] - No positions (but can still have roles)
