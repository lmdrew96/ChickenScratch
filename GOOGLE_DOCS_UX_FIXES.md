# Google Docs UX Fixes

## Summary
Fixed two UX issues related to Google Doc links in the committee workflow system.

## Changes Made

### Issue 1: Submissions Coordinator Can't Re-open Created Docs
**Problem**: After a Google Doc was created via the "Review" button, there was no way for Submissions Coordinators to open it again without manually going to Google Drive.

**Solution**: Added an "Open Google Doc" button in the submission detail modal that appears when a submission has a `google_docs_link` saved.

**Implementation**:
- Added conditional rendering in the submission detail modal
- Button appears for all roles when `google_docs_link` exists
- Clicking the button opens the doc in the preview modal (same as Review button)
- Uses the same preview modal component for consistency

### Issue 2: Proofreader's "Edit Docs" Button Always Asks for URL
**Problem**: The "Edit Docs" button prompted for a Google Docs URL even though the doc was already created by the Submissions Coordinator and saved in `google_docs_link`.

**Solution**: Changed the Proofreader's "Edit Docs" button behavior to be context-aware:
- If `google_docs_link` exists: Opens it directly in preview modal (no prompt)
- If `google_docs_link` is null: Shows input field to manually add a URL (existing behavior as fallback)

**Implementation**:
- Modified `handleAction` function to check for existing `google_docs_link` before prompting
- Updated button label to reflect state: "Edit Docs" when link exists, "Add Google Docs Link" when it doesn't
- Both paths use the same preview modal component

## Technical Details

### File Modified
- `your-repo/src/components/committee/kanban-board.tsx`

### Key Changes

1. **Updated `handleAction` function**:
   ```typescript
   if (action === 'open_docs') {
     // If google_docs_link exists, open it directly in edit mode
     if (submission.google_docs_link) {
       setGoogleDocUrl(submission.google_docs_link);
       setIsProcessing(null);
       return;
     }
     // Otherwise, prompt for URL (fallback for manual entry)
     const url = prompt('Enter Google Docs link:');
     // ... rest of logic
   }
   ```

2. **Added "Open Google Doc" button in submission detail modal**:
   ```typescript
   {selectedSubmission.google_docs_link && (
     <button
       className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center gap-2"
       onClick={() => {
         setGoogleDocUrl(selectedSubmission.google_docs_link!);
       }}
     >
       <svg>...</svg>
       Open Google Doc
     </button>
   )}
   ```

3. **Updated Proofreader button label**:
   ```typescript
   {userRole === 'proofreader' && (
     <button onClick={() => handleAction(selectedSubmission, 'open_docs')}>
       {selectedSubmission.google_docs_link ? 'Edit Docs' : 'Add Google Docs Link'}
     </button>
   )}
   ```

## User Experience Improvements

### For Submissions Coordinators:
- Can now easily re-access Google Docs they've created
- No need to manually navigate to Google Drive
- Consistent with the initial "Review" workflow

### For Proofreaders:
- Seamless access to existing Google Docs
- No unnecessary prompts when doc already exists
- Clear indication of whether doc exists or needs to be added
- Fallback option to manually add URL if needed

### For All Committee Members:
- Universal "Open Google Doc" button in submission details when doc exists
- Consistent preview modal experience across all roles
- Better visibility of document status

## Testing Recommendations

1. **Submissions Coordinator Flow**:
   - Create a Google Doc via "Review" button
   - Close the modal
   - Re-open the submission detail modal
   - Verify "Open Google Doc" button appears
   - Click it and verify doc opens in preview modal

2. **Proofreader Flow with Existing Doc**:
   - Open a submission that has `google_docs_link` set
   - Verify button says "Edit Docs"
   - Click it and verify doc opens directly (no prompt)

3. **Proofreader Flow without Doc**:
   - Open a submission without `google_docs_link`
   - Verify button says "Add Google Docs Link"
   - Click it and verify prompt appears for URL entry

4. **Cross-role Access**:
   - Test with Editor-in-Chief role
   - Verify "Open Google Doc" button appears for submissions with docs
   - Verify it works consistently across all roles

## Notes

- The modal opens Google Docs in **edit mode** (not preview mode) so users can make changes directly
- Modal title changed from "Google Doc Preview" to "Google Doc Editor" to reflect edit capability
- The "Open in New Tab" button opens the same edit URL in a new browser tab for full Google Docs interface
- The modal is shared across all workflows for consistency
- No changes were needed to the backend API - all changes are frontend UX improvements
- Users can edit documents directly in the embedded iframe, especially important for Proofreaders
