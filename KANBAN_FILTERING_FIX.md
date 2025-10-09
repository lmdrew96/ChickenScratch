# Kanban Board Filtering Fix

## Problem
The committee kanban board was showing ALL submissions to every committee position instead of filtering them by role. Every user (Proofreader, Lead Design, Submissions Coordinator) was seeing the same unfiltered view.

## Root Cause
The system has two role storage methods:
1. **Legacy system**: `profiles.role` field (single role, lowercase snake_case like "proofreader")
2. **New system**: `user_roles.positions` array (multiple positions, title case like "Proofreader")

The committee page was passing `profile.role` to the kanban board, but for users in the new system, this field was often null/undefined. The kanban board's switch statement never matched, so it fell through to the default case showing all submissions.

## The Fix

### 1. Updated `src/app/committee/page.tsx`
- Now fetches user's actual positions from `user_roles` table using `getCurrentUserRole()`
- Converts title case positions ("Proofreader") to lowercase snake_case ("proofreader")
- Passes the correct format to the kanban board component
- Falls back to legacy `profile.role` if no positions found

### 2. Added Debug Logging
Added comprehensive console logging to track:
- What positions are detected from `user_roles`
- What role string is passed to kanban board
- Which switch case matches in the kanban board
- How many submissions are in each column
- Sample submission statuses for debugging

### 3. Fixed TypeScript Error
Changed `userPosition` from implicit type to explicit `string` type to allow dynamic string generation from position names.

## Testing
To verify the fix works:

1. Start dev server: `cd your-repo && pnpm dev`
2. Log in as a committee member (Proofreader, Lead Design, or Submissions Coordinator)
3. Navigate to `/committee`
4. Open browser console (F12)
5. Check for logs starting with `[Committee Page]` and `[KanbanBoard]`

Expected behavior:
- **Submissions Coordinator** sees: New Submissions, Under Review, Approved (3 columns)
- **Proofreader** sees: Assigned to Me, In Progress, Committed (3 columns, writing only)
- **Lead Design** sees: Visual Art Assigned, From Proofreading, In Canva, Committed (4 columns)
- **Editor-in-Chief** sees: All 13 columns from all positions

## Console Logs to Check
```
[Committee Page] User positions: ["Proofreader"]
[Committee Page] Passing userPosition to kanban: proofreader
[Committee Page] Display role: Proofreader
[KanbanBoard] Component mounted
[KanbanBoard] userRole: proofreader
[KanbanBoard getColumns] Generating columns for role: proofreader
[KanbanBoard] Checking switch statement for role: proofreader
[KanbanBoard] Matched proofreader
[KanbanBoard] Proofreader columns: 3
[KanbanBoard] Columns generated: 3
[KanbanBoard] Column 1: "Assigned to Me" - X submissions
[KanbanBoard] Column 2: "In Progress" - Y submissions
[KanbanBoard] Column 3: "Committed" - Z submissions
```

## Files Modified
- `src/app/committee/page.tsx` - Fixed role detection and conversion
- `src/components/committee/kanban-board.tsx` - Added debug logging

## Build Status
✅ Build passes successfully
✅ TypeScript errors resolved
✅ All routes compile correctly
