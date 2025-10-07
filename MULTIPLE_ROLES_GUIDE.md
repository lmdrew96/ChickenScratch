# Multiple Roles Guide

This guide explains how users can have both officer and committee roles simultaneously.

## Overview

The role system has been updated to support multiple roles per user. Previously, a user could only have one role (`officer` OR `committee`). Now, users can have:

- Officer role only: `['officer']`
- Committee role only: `['committee']`
- Both roles: `['officer', 'committee']`
- No roles: `[]` (but can still be a member if `is_member = true`)

## Database Schema

### Before (Single Role)
```sql
role TEXT CHECK (role IN ('officer', 'committee') OR role IS NULL)
```

### After (Multiple Roles)
```sql
roles TEXT[] DEFAULT '{}'
```

## Migration

The migration file `supabase/migrations/allow_multiple_roles.sql` handles:

1. ✅ Adding the new `roles` array column
2. ✅ Migrating existing single role data to the array format
3. ✅ Removing the old single `role` column
4. ✅ Adding validation constraints
5. ✅ Creating helper functions for role checks

### Applying the Migration

**Option A: Using Supabase CLI**
```bash
cd your-repo
supabase db push
```

**Option B: Manual SQL Execution**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/allow_multiple_roles.sql`
3. Run the SQL

## Usage Examples

### Setting Multiple Roles

**Via Supabase Dashboard:**
1. Go to Table Editor → `user_roles`
2. Find the user
3. Edit the `roles` column
4. Enter: `{officer,committee}` (PostgreSQL array syntax)

**Via SQL:**
```sql
-- Set user as both officer and committee
UPDATE user_roles 
SET roles = ARRAY['officer', 'committee']
WHERE user_id = 'user-uuid-here';

-- Set user as officer only
UPDATE user_roles 
SET roles = ARRAY['officer']
WHERE user_id = 'user-uuid-here';

-- Set user as committee only
UPDATE user_roles 
SET roles = ARRAY['committee']
WHERE user_id = 'user-uuid-here';

-- Remove all roles (but keep as member)
UPDATE user_roles 
SET roles = ARRAY[]::TEXT[]
WHERE user_id = 'user-uuid-here';
```

**Via Application Code:**
```typescript
import { updateUserRole } from '@/lib/actions/roles'

// Set multiple roles
await updateUserRole(userId, {
  roles: ['officer', 'committee']
})

// Set single role
await updateUserRole(userId, {
  roles: ['officer']
})
```

### Checking Roles in Code

```typescript
import { getCurrentUserRole } from '@/lib/actions/roles'

const userRole = await getCurrentUserRole()

// Check if user has officer role
const isOfficer = userRole?.roles?.includes('officer')

// Check if user has committee role
const isCommittee = userRole?.roles?.includes('committee')

// Check if user has both roles
const hasBothRoles = 
  userRole?.roles?.includes('officer') && 
  userRole?.roles?.includes('committee')

// Check if user has any role
const hasAnyRole = userRole?.roles && userRole.roles.length > 0
```

### Helper Functions (Database Level)

The migration creates PostgreSQL functions you can use in queries:

```sql
-- Check if user is an officer
SELECT is_officer('user-uuid-here');

-- Check if user is committee member
SELECT is_committee('user-uuid-here');

-- Check if user has a specific role (in a query)
SELECT * FROM user_roles 
WHERE user_has_role(user_roles, 'officer');
```

## TypeScript Types

The TypeScript types have been updated to reflect the array structure:

```typescript
// Database type
type UserRole = {
  id: string
  user_id: string
  is_member: boolean
  roles: ('officer' | 'committee')[]  // Array instead of single value
  position: 'BBEG' | 'Dictator-in-Chief' | ... | null
  created_at: string
}

// When querying users with roles
type UserWithRole = {
  id: string
  email: string | null
  is_member?: boolean
  roles?: ('officer' | 'committee')[]  // Array
  position?: 'BBEG' | 'Dictator-in-Chief' | ... | null
}
```

## Common Scenarios

### Scenario 1: User is Officer with Admin Position
```typescript
{
  is_member: true,
  roles: ['officer'],
  position: 'Dictator-in-Chief'
}
```

### Scenario 2: User is Both Officer and Committee Member
```typescript
{
  is_member: true,
  roles: ['officer', 'committee'],
  position: 'Submissions Coordinator'
}
```

### Scenario 3: User is Committee Member Only
```typescript
{
  is_member: true,
  roles: ['committee'],
  position: 'Proofreader'
}
```

### Scenario 4: User is Member but No Specific Role
```typescript
{
  is_member: true,
  roles: [],
  position: null
}
```

## Admin Panel Updates

The admin panel will need to be updated to support selecting multiple roles. The UI should allow:

1. Checkboxes for both officer and committee roles
2. Clear indication when a user has both roles
3. Ability to add/remove individual roles without affecting the other

Example UI concept:
```
User: john@example.com
☑ Member
☑ Officer
☑ Committee
Position: [Dropdown]
```

## Testing

Use the `/test-role` page to verify role assignments:

1. Visit `/test-role` while logged in
2. Check the "Role Information" section
3. Verify:
   - Roles array shows correct values
   - "Is Officer" shows true/false correctly
   - "Is Committee" shows true/false correctly

## Migration Checklist

- [ ] Apply the database migration
- [ ] Verify existing roles migrated correctly
- [ ] Update admin panel UI to support multiple role selection
- [ ] Test role assignments
- [ ] Update any role-checking logic in the application
- [ ] Document any role-based access control changes

## Backwards Compatibility

The migration automatically converts existing single-role data to the array format:
- `role: 'officer'` → `roles: ['officer']`
- `role: 'committee'` → `roles: ['committee']`
- `role: null` → `roles: []`

All existing functionality continues to work after the migration.
