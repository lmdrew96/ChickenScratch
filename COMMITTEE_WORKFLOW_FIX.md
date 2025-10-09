# Committee Workflow Status Fix

## Problem Identified

When Submissions Coordinator clicked "Review" button, submissions disappeared from the kanban board because of status mismatches between the API route and the kanban column filters.

## Root Cause

The workflow API was setting statuses that didn't match what the kanban columns were filtering for:

### Original Bug:
- **Action**: Submissions Coordinator clicks "Review" (which was mapped to 'approve')
- **Status Set**: `with_proofreader` or `with_lead_design`
- **Expected Column**: "Under Review" (filters for `with_coordinator`)
- **Result**: ❌ Submission disappeared (no column was looking for those statuses)

## Complete Status Flow (FIXED)

### Submissions Coordinator Workflow

**Columns:**
1. **New Submissions** - Filters: `null` or `pending_coordinator`
2. **Under Review** - Filters: `with_coordinator`
3. **Approved** - Filters: `coordinator_approved`

**Actions & Status Changes:**
- Click "Review" → Sets status to `with_coordinator` ✅
- Click "Approve" (in modal) → Sets status to `coordinator_approved` ✅
- Click "Decline" (in modal) → Sets status to `coordinator_declined` ✅

### Proofreader Workflow

**Columns:**
1. **Assigned to Me** - Filters: `coordinator_approved` AND type=`writing`
2. **In Progress** - Filters: Has `google_docs_link` AND no `proofreader_committed_at`
3. **Committed** - Filters: `proofreader_committed`

**Actions & Status Changes:**
- Click "Edit Docs" → Prompts for Google Docs link
- Submit link → Sets `google_docs_link`, status to `proofreader_committed`, timestamp ✅

### Lead Design Workflow

**Columns:**
1. **Visual Art Assigned** - Filters: `coordinator_approved` AND type=`visual`
2. **From Proofreading** - Filters: `proofreader_committed`
3. **In Canva** - Filters: Has `lead_design_commit_link` AND no `lead_design_committed_at`
4. **Committed** - Filters: `lead_design_committed`

**Actions & Status Changes:**
- Click "Add to Canva" → Prompts for Canva link
- Submit link → Sets `lead_design_commit_link`, status to `lead_design_committed`, timestamp ✅

### Editor-in-Chief Workflow

**Columns (sees ALL 13 columns):**
1. New Submissions
2. Coordinator Review
3. Coordinator Approved
4. Proofreader Assigned (writing only)
5. Proofreading
6. Proofread Complete
7. Design: Visual Art (visual only)
8. Design: From Proofread
9. In Canva
10. Design Complete
11. **EIC: Final Review** - Filters: `with_editor_in_chief`, `lead_design_committed`, or `proofreader_committed`
12. **EIC: Approved** - Filters: `editor_approved`
13. **EIC: Declined** - Filters: `editor_declined` or `coordinator_declined`

**Actions & Status Changes:**
- Click "Final Review" → Sets status to `approve` (becomes `editor_approved`) ✅
- Click "Final Approve" (in modal) → Sets status to `editor_approved` ✅
- Click "Final Decline" (in modal) → Sets status to `editor_declined` ✅

## Changes Made

### 1. API Route (`/api/committee-workflow/route.ts`)

**Added 'review' action:**
```typescript
action: z.enum(['review', 'approve', 'decline', 'commit', 'assign'])
```

**Fixed Submissions Coordinator logic:**
```typescript
case 'submissions_coordinator':
  if (action === 'review') {
    // Move to "Under Review" column
    newStatus = 'with_coordinator';
    updatePayload.committee_status = newStatus;
  } else if (action === 'approve') {
    // Move to "Approved" column
    newStatus = 'coordinator_approved';
    updatePayload.committee_status = newStatus;
    updatePayload.coordinator_reviewed_at = new Date().toISOString();
  } else if (action === 'decline') {
    newStatus = 'coordinator_declined';
    // ... decline logic
  }
  break;
```

### 2. Kanban Board (`/components/committee/kanban-board.tsx`)

**Changed primary action for Submissions Coordinator:**
```typescript
case 'submissions_coordinator':
  return 'review';  // Changed from 'approve'
```

## Complete Workflow Path

### For Writing Submissions:
1. **New** → Coordinator clicks "Review" → **Under Review** (`with_coordinator`)
2. **Under Review** → Coordinator clicks "Approve" → **Approved** (`coordinator_approved`)
3. **Approved** → Proofreader sees in "Assigned to Me"
4. **Assigned** → Proofreader adds Google Docs link → **In Progress**
5. **In Progress** → Proofreader commits → **Committed** (`proofreader_committed`)
6. **Committed** → Lead Design sees in "From Proofreading"
7. **From Proofreading** → Lead Design adds Canva link → **In Canva**
8. **In Canva** → Lead Design commits → **Design Complete** (`lead_design_committed`)
9. **Design Complete** → EIC sees in "Final Review"
10. **Final Review** → EIC approves → **EIC: Approved** (`editor_approved`)

### For Visual Submissions:
1. **New** → Coordinator clicks "Review" → **Under Review** (`with_coordinator`)
2. **Under Review** → Coordinator clicks "Approve" → **Approved** (`coordinator_approved`)
3. **Approved** → Lead Design sees in "Visual Art Assigned"
4. **Visual Art Assigned** → Lead Design adds Canva link → **In Canva**
5. **In Canva** → Lead Design commits → **Design Complete** (`lead_design_committed`)
6. **Design Complete** → EIC sees in "Final Review"
7. **Final Review** → EIC approves → **EIC: Approved** (`editor_approved`)

## Status Reference

All possible `committee_status` values:
- `null` / `pending_coordinator` - New submission
- `with_coordinator` - Being reviewed by coordinator
- `coordinator_approved` - Approved by coordinator, ready for next step
- `coordinator_declined` - Declined by coordinator
- `with_proofreader` - Assigned to proofreader (legacy, now uses coordinator_approved)
- `proofreader_committed` - Proofreading complete
- `with_lead_design` - Assigned to lead design (legacy, now uses coordinator_approved)
- `lead_design_committed` - Design complete
- `with_editor_in_chief` - Ready for EIC review
- `editor_approved` - Final approval by EIC
- `editor_declined` - Declined by EIC

## Testing Checklist

- [x] Submissions Coordinator can click "Review" and submission moves to "Under Review"
- [x] Submissions Coordinator can click "Approve" and submission moves to "Approved"
- [x] Proofreader sees approved writing submissions
- [x] Lead Design sees approved visual submissions
- [x] Lead Design sees proofread submissions
- [x] EIC sees all workflow stages
- [x] Page revalidation works after actions
- [x] No submissions disappear during workflow

## Notes

- The `revalidatePath('/committee')` in the API ensures the page data is refreshed
- The kanban board uses `window.location.reload()` as a fallback to ensure UI updates
- Officers have full access and default to Editor-in-Chief permissions
- All actions are logged in the audit trail
