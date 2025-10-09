# Submission Deletion Implementation

## Overview
Added submission deletion functionality for admins (BBEG and Dictator-in-Chief positions) with proper warnings, confirmations, and safeguards.

## Implementation Details

### 1. API Endpoint
**File:** `src/app/api/submissions/[id]/delete/route.ts`

- **Authorization:** Only users with "BBEG" or "Dictator-in-Chief" positions can delete submissions
- **Functionality:**
  - Verifies user authentication and admin permissions
  - Fetches submission details including file URLs
  - Deletes associated files from Supabase Storage
  - Logs deletion action to audit_log table for accountability
  - Deletes submission record from database
  - Revalidates relevant pages (editor, committee, mine, published)

### 2. Delete Confirmation Modal
**File:** `src/components/editor/delete-confirmation-modal.tsx`

- **Features:**
  - Red/danger styling to indicate destructive action
  - Shows submission title and author
  - Lists what will be deleted (submission record, uploaded file, Google Doc link)
  - Requires typing "DELETE" to confirm (prevents accidental deletion)
  - Loading state during deletion
  - Escape key to cancel
  - Click outside to close (when not deleting)

### 3. Submissions List Component
**File:** `src/components/editor/submissions-list-with-delete.tsx`

- **Features:**
  - Client component that displays all submissions
  - Delete button (trash icon) only visible to admins
  - Red/danger styling for delete button
  - Toast notifications for success/error
  - Integrates with DeleteConfirmationModal
  - Refreshes page after successful deletion

### 4. Editor Dashboard Integration
**File:** `src/app/editor/page.tsx` (modified)

- Added SubmissionsListWithDelete component at the bottom of the dashboard
- Fetches author names for all submissions
- Checks if user is admin (BBEG or Dictator-in-Chief)
- Passes submissions and admin status to the component

## Security Features

1. **Authorization Check:** Only BBEG or Dictator-in-Chief can delete
2. **Confirmation Required:** User must type "DELETE" to confirm
3. **Audit Trail:** All deletions are logged with:
   - Actor ID (who deleted)
   - Submission details
   - Timestamp
   - Files deleted
4. **File Cleanup:** Automatically removes associated files from storage

## User Experience

1. **Visual Indicators:**
   - Red/danger colors throughout
   - Trash icon for delete button
   - Warning icon in modal

2. **Clear Communication:**
   - Shows what will be deleted
   - Explains action is permanent
   - Requires explicit confirmation

3. **Feedback:**
   - Success toast on completion
   - Error toast if deletion fails
   - Loading state during operation

## Files Created/Modified

### New Files:
- `src/app/api/submissions/[id]/delete/route.ts`
- `src/components/editor/delete-confirmation-modal.tsx`
- `src/components/editor/submissions-list-with-delete.tsx`

### Modified Files:
- `src/app/editor/page.tsx`

## Usage

1. Navigate to Editor-in-Chief Dashboard (`/editor`)
2. Scroll to "All Submissions" section at the bottom
3. If you have BBEG or Dictator-in-Chief position, you'll see a red trash icon next to each submission
4. Click the trash icon to open the confirmation modal
5. Review the submission details and what will be deleted
6. Type "DELETE" in the confirmation field
7. Click "Delete Permanently" button
8. The submission and associated files will be permanently deleted

## Notes

- Only admins (BBEG or Dictator-in-Chief) can see and use the delete functionality
- Deletion is permanent and cannot be undone
- All deletions are logged in the audit_log table for accountability
- Google Docs themselves are NOT deleted from Google Drive, only the link is removed
