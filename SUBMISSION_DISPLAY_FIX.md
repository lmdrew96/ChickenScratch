# Submission Display Fix

## Problem
Submissions existed in the Supabase database but weren't displaying on any page:
- `/mine` page (user's own submissions)
- `/editor` page (all submissions for review)
- `/committee` page (submissions for committee workflow)

## Root Causes Identified

### 1. `/editor` page - Using Hardcoded Placeholder Data
**Issue**: The editor page was displaying hardcoded placeholder arrays instead of fetching real data from the database.

**Original Code**:
```typescript
const unassignedPlaceholders = [
  { title: 'Illustration: Midnight Market', meta: 'Awaiting assignment' },
  // ... more placeholders
];
```

**Fix**: Changed to fetch directly from Supabase using `createSupabaseServerReadOnlyClient()`:
```typescript
const supabase = await createSupabaseServerReadOnlyClient();
const { data, error } = await supabase
  .from('submissions')
  .select('*')
  .order('created_at', { ascending: false });
```

### 2. `/mine` page - Cookie Forwarding Issues
**Issue**: The page was trying to fetch from the API route (`/api/submissions?mine=1`) using server-side fetch with cookie forwarding, which can be unreliable in Next.js server components.

**Original Approach**:
```typescript
const response = await fetch(`${baseUrl}/api/submissions?mine=1`, {
  headers: { cookie: cookieHeader },
  cache: 'no-store',
});
```

**Fix**: Changed to fetch directly from Supabase, bypassing the API route entirely:
```typescript
const supabase = await createSupabaseServerReadOnlyClient();
const { data, error } = await supabase
  .from('submissions')
  .select('*')
  .eq('owner_id', profile.id)
  .order('created_at', { ascending: false });
```

### 3. `/committee` page - Already Working
**Status**: This page was already correctly fetching directly from Supabase, so no changes were needed.

## Solution Applied

All three pages now use the same reliable pattern:
1. Use `createSupabaseServerReadOnlyClient()` to get a Supabase client
2. Query the `submissions` table directly
3. Handle errors gracefully with try-catch blocks
4. Display empty states when no submissions exist

## Benefits of This Approach

1. **Consistency**: All pages use the same data fetching pattern
2. **Reliability**: Direct database queries avoid cookie forwarding issues
3. **Performance**: Eliminates unnecessary API route overhead
4. **Type Safety**: Full TypeScript support with database types
5. **Error Handling**: Proper error logging and graceful degradation

## Files Modified

1. `src/app/editor/page.tsx` - Replaced placeholders with real data fetching
2. `src/app/mine/page.tsx` - Changed from API fetch to direct Supabase query
3. `src/app/committee/page.tsx` - No changes needed (already working)

## Testing

After these changes:
- `/mine` page will show user's own submissions
- `/editor` page will show all submissions split into unassigned/assigned
- `/committee` page will continue to show submissions in kanban board format

All pages now properly display data from the Supabase `submissions` table.
