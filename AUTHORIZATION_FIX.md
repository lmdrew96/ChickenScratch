# Authorization Bug Fix

## Problem Summary

Users with correct admin roles in the database (positions: "Dictator-in-Chief", "Editor-in-Chief", etc.) were being redirected from admin/restricted pages back to `/mine` even though the database showed they had the proper permissions.

## Root Cause

The application had **two separate authorization systems** that were out of sync:

### Old System (profiles table)
- Single `role` field in the `profiles` table
- Values like: 'admin', 'editor', 'bbeg', 'dictator_in_chief', etc.
- Used by the authorization guards in `src/lib/auth/guards.ts`

### New System (user_roles table)
- Separate `user_roles` table with:
  - `positions` array: ["Dictator-in-Chief", "Editor-in-Chief", etc.]
  - `roles` array: ["officer", "committee"]
  - `is_member` boolean
- Used by admin panel and role management

**The bug:** All authorization guards (`requireRole`, `requireOfficerRole`, `requireCommitteeRole`) were checking the OLD `profile.role` field, but user permissions were stored in the NEW `user_roles` table. The guards never looked at the `user_roles` table, so they always failed.

## What Was Fixed

### 1. Updated Authorization Guards (`src/lib/auth/guards.ts`)

Added new helper functions to check the `user_roles` table:

```typescript
// New position constants matching user_roles table
export const OFFICER_POSITIONS = ['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare']
export const COMMITTEE_POSITIONS = ['Editor-in-Chief', 'Submissions Coordinator', 'Proofreader', 'Lead Design']

// New helper functions
export function hasOfficerAccess(positions?: string[], roles?: string[]): boolean
export function hasCommitteeAccess(positions?: string[], roles?: string[]): boolean
export function hasEditorAccess(positions?: string[], roles?: string[]): boolean
```

### 2. Updated All Guard Functions

Modified `requireRole`, `requireOfficerRole`, and `requireCommitteeRole` to:

1. **First** check the new `user_roles` table using `getCurrentUserRole()`
2. Check if user has appropriate positions or roles
3. **Fallback** to the old `profile.role` check for backward compatibility

Example of the fix:

```typescript
export async function requireOfficerRole(nextUrl?: string) {
  const { session, profile } = await requireUser(nextUrl);
  
  // NEW: Check user_roles table first
  const userRole = await getCurrentUserRole();
  
  if (userRole && userRole.is_member) {
    if (hasOfficerAccess(userRole.positions, userRole.roles)) {
      return { session, profile };
    }
  }
  
  // OLD: Fallback to legacy profile.role check
  const currentRole = (profile.role ?? '').toLowerCase();
  if (currentRole === 'admin' || isOfficerRole(currentRole)) {
    return { session, profile };
  }

  redirect('/mine');
}
```

### 3. Fixed Admin Page Redirect

Changed the admin page redirect from `/` to `/mine` to match other protected pages.

## Access Control Matrix

After the fix, here's who can access what:

| Position | /admin | /officers | /editor | /committee |
|----------|--------|-----------|---------|------------|
| BBEG | ✅ | ✅ | ✅ | ✅ |
| Dictator-in-Chief | ✅ | ✅ | ✅ | ✅ |
| Scroll Gremlin | ❌ | ✅ | ✅ | ✅ |
| Chief Hoarder | ❌ | ✅ | ✅ | ✅ |
| PR Nightmare | ❌ | ✅ | ✅ | ✅ |
| Editor-in-Chief | ❌ | ❌ | ✅ | ✅ |
| Submissions Coordinator | ❌ | ❌ | ✅ | ✅ |
| Proofreader | ❌ | ❌ | ✅ | ✅ |
| Lead Design | ❌ | ❌ | ✅ | ✅ |

**Key Rules:**
- **BBEG** and **Dictator-in-Chief** have full admin access (all pages)
- **Officer positions** can access officer, editor, and committee pages
- **Committee positions** can access editor and committee pages
- Users with `roles: ["officer"]` have officer access
- Users with `roles: ["committee"]` have committee/editor access

## Testing

To verify the fix works:

1. Log in as a user with "Dictator-in-Chief" position
2. Navigate to `/admin` - should see admin panel
3. Navigate to `/officers` - should see officers dashboard
4. Navigate to `/editor` - should see editor dashboard

The console logs in the admin page will show:
```
=== ADMIN PAGE DEBUG ===
User role data: {
  "positions": ["Dictator-in-Chief", "Editor-in-Chief"],
  "roles": ["officer", "committee"],
  "is_member": true
}
Is admin check result: true
Has Dictator-in-Chief: true
========================
```

## Backward Compatibility

The fix maintains backward compatibility with the old `profiles.role` system:
- If `user_roles` table check fails, guards fall back to checking `profile.role`
- Existing users with roles in the `profiles` table will still work
- New users should use the `user_roles` table system

## Files Changed

1. `src/lib/auth/guards.ts` - Updated all authorization guard functions
2. `src/app/admin/page.tsx` - Fixed redirect from `/` to `/mine`
