# Submissions Coordinator Review Workflow Update

## Overview
Updated the Submissions Coordinator workflow to make the "Review" button context-aware based on the submission's current status.

## Changes Made

### 1. Kanban Board UI (`src/components/committee/kanban-board.tsx`)

#### Context-Aware Buttons
The kanban board now displays different buttons based on which column a submission is in:

**New Submissions Column:**
- Shows only a "Review" button
- Action: Moves submission to "Under Review" (status: `with_coordinator`)

**Under Review Column:**
- Shows three buttons:
  - "Review" button (primary) - Triggers Make webhook for file conversion
  - "Approve" button (green) - Moves to Proofreader's "Assigned to Me"
  - "Decline" button (red) - Declines the submission

**Approved Column:**
- No interactive buttons (read-only)

#### Implementation Details
- Added `getSubmissionButtons()` function that returns button configuration based on:
  - User role
  - Column ID
  - Submission status
- Each button has a variant (`primary`, `success`, `danger`) for appropriate styling
- Buttons are rendered dynamically with proper styling and actions

### 2. Workflow API (`src/app/api/committee-workflow/route.ts`)

#### Context-Aware Review Action
The `review` action now behaves differently based on the submission's current status:

**When status is `null` or `pending_coordinator`:**
```typescript
// New Submissions → Under Review
newStatus = 'with_coordinator';
updatePayload.committee_status = newStatus;
```

**When status is `with_coordinator`:**
```typescript
// Under Review → Trigger Make webhook
// TODO: Add Make webhook integration here
// No status change occurs
console.log('[Committee Workflow] Webhook trigger placeholder - file:', submission.file_url);
```

**When action is `approve`:**
```typescript
// Under Review → Approved
newStatus = 'coordinator_approved';
updatePayload.committee_status = newStatus;
updatePayload.coordinator_reviewed_at = new Date().toISOString();
```

## Workflow Flow

### Correct Flow for Writing Submissions:

1. **New Submissions** → Click "Review" → Moves to **Under Review** (status: `with_coordinator`)
2. **Under Review** → Click "Review" → Triggers Make webhook to convert uploaded file to Google Doc (NO status change)
3. **Under Review** → Click "Approve" → Moves to Proofreader's **Assigned to Me** (status: `coordinator_approved`)

### Visual Representation:

```
┌─────────────────┐
│ New Submissions │
│                 │
│  [Review]       │ ← Only Review button
└────────┬────────┘
         │ Click "Review"
         ↓
┌─────────────────┐
│  Under Review   │
│                 │
│  [Review]       │ ← Review (webhook trigger)
│  [Approve]      │ ← Approve (move to proofreader)
│  [Decline]      │ ← Decline submission
└────────┬────────┘
         │ Click "Approve"
         ↓
┌─────────────────┐
│    Approved     │
│                 │
│  (read-only)    │ ← No buttons
└─────────────────┘
```

## Next Steps

### Make Webhook Integration
The webhook integration placeholder is ready in the API. To complete the integration:

1. Add the Make webhook endpoint URL to environment variables
2. Implement the actual webhook call in the API when `review` action is triggered on `with_coordinator` status
3. The webhook should:
   - Receive the file URL from Supabase storage
   - Convert the file to Google Docs format
   - Return the Google Docs link
   - Update the submission with the `google_docs_link` field

### Example Implementation:
```typescript
else if (submission.committee_status === 'with_coordinator') {
  // Trigger Make webhook
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submissionId: submission.id,
      fileUrl: submission.file_url,
      fileName: submission.file_name,
      fileType: submission.file_type
    })
  });
  
  const { googleDocsLink } = await response.json();
  updatePayload.google_docs_link = googleDocsLink;
}
```

## Testing Checklist

- [ ] Verify "Review" button appears in New Submissions column
- [ ] Click "Review" in New Submissions moves submission to Under Review
- [ ] Verify three buttons appear in Under Review column
- [ ] Click "Review" in Under Review triggers webhook (check console logs)
- [ ] Click "Approve" in Under Review moves to Approved column
- [ ] Click "Decline" in Under Review prompts for reason and declines submission
- [ ] Verify no buttons appear in Approved column
- [ ] Test with Editor-in-Chief role to ensure they see all columns correctly

## Files Modified

1. `src/components/committee/kanban-board.tsx` - UI changes for context-aware buttons
2. `src/app/api/committee-workflow/route.ts` - API logic for context-aware review action

## Related Documentation

- See `MAKE_WEBHOOK_INTEGRATION.md` for webhook setup details
- See `COMMITTEE_WORKFLOW_FIX.md` for overall workflow documentation
