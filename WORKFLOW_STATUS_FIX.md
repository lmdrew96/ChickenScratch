# Workflow Status Fix

## Problem
When Submissions Coordinator clicked "Review" or "Approve":
- Submissions disappeared from all columns
- Did NOT appear in Proofreader's workflow
- Workflow was broken

## Root Cause Analysis

### The Status Flow Issue
1. **"Review" button** set status to: `with_coordinator` ✓
2. **"Approve" button** set status to: `coordinator_approved` ✓
3. **Proofreader's "Assigned to Me" column** filtered for: `with_proofreader` OR `coordinator_approved` ✗

**The Problem:** Nothing ever set the status to `with_proofreader`! This was a phantom status that didn't exist in the workflow logic.

### The Mismatch
- Coordinator "Approve" correctly sets `coordinator_approved`
- But Proofreader column was looking for `with_proofreader` (which never gets set)
- Same issue for Lead Design looking for `with_lead_design`

## Solution

### 1. Fixed Kanban Board Filters
Removed references to phantom statuses that were never set:

**Proofreader's "Assigned to Me" column:**
```typescript
// BEFORE (looking for status that never gets set)
submissions.filter(s => 
  (s.committee_status === 'with_proofreader' || s.committee_status === 'coordinator_approved') 
  && s.type === 'writing'
)

// AFTER (only look for actual status)
submissions.filter(s => 
  s.committee_status === 'coordinator_approved' && s.type === 'writing'
)
```

**Lead Design's "Visual Art Assigned" column:**
```typescript
// BEFORE
submissions.filter(s => 
  (s.committee_status === 'with_lead_design' || s.committee_status === 'coordinator_approved') 
  && s.type === 'visual'
)

// AFTER
submissions.filter(s => 
  s.committee_status === 'coordinator_approved' && s.type === 'visual'
)
```

### 2. Added Console Logging
Added comprehensive logging to track status changes:

```typescript
console.log('[Committee Workflow] Approve action - setting status to:', newStatus, 'for submission type:', submission.type);
console.log('[Committee Workflow] Updating submission:', submissionId, 'with payload:', updatePayload);
console.log('[Committee Workflow] Successfully updated submission to status:', newStatus);
```

## Expected Flow Now

### For Writing Submissions:
1. **New submission** → `null` or `pending_coordinator` status
2. **Click "Review"** → `with_coordinator` (stays in Coordinator's "Under Review")
3. **Click "Approve"** → `coordinator_approved` (moves to Proofreader's "Assigned to Me")
4. **Proofreader adds Google Docs link** → `proofreader_committed` (moves to Lead Design)
5. **Lead Design adds Canva link** → `lead_design_committed` (moves to Editor-in-Chief)
6. **Editor approves** → `editor_approved` (ready for publishing)

### For Visual Submissions:
1. **New submission** → `null` or `pending_coordinator` status
2. **Click "Review"** → `with_coordinator` (stays in Coordinator's "Under Review")
3. **Click "Approve"** → `coordinator_approved` (moves to Lead Design's "Visual Art Assigned")
4. **Lead Design adds Canva link** → `lead_design_committed` (moves to Editor-in-Chief)
5. **Editor approves** → `editor_approved` (ready for publishing)

## Files Modified
1. `src/app/api/committee-workflow/route.ts` - Added console logging
2. `src/components/committee/kanban-board.tsx` - Fixed column filters to match actual status flow

## Testing
To verify the fix:
1. Log in as Submissions Coordinator
2. Click "Review" on a submission → should move to "Under Review" column
3. Click "Approve" on a submission → should move to "Approved" column
4. Log in as Proofreader
5. Check "Assigned to Me" column → approved writing submissions should appear
6. Log in as Lead Design
7. Check "Visual Art Assigned" column → approved visual submissions should appear

Check browser console for detailed logging of status changes.
