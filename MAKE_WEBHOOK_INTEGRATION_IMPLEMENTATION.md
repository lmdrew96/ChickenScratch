# Make Webhook Integration Implementation

## Overview
Implemented the Make webhook integration for converting uploaded files to Google Docs. When a Submissions Coordinator clicks "Review" on a submission in the "Under Review" column, the system automatically converts the file to a Google Doc and opens it in a new tab.

## Implementation Details

### 1. New API Endpoint: `/api/convert-to-gdoc`
**File:** `src/app/api/convert-to-gdoc/route.ts`

**Functionality:**
- Accepts `submission_id` in request body
- Validates user has committee access
- Fetches submission data including file URL, file name, title, and owner info
- Creates a signed URL for the file from Supabase Storage (valid for 1 hour)
- Calls Make webhook with payload:
  ```json
  {
    "submission_id": "uuid",
    "file_url": "signed_url",
    "file_name": "filename.docx",
    "title": "Submission Title",
    "author": "Author Name"
  }
  ```
- Waits for Make response containing `google_doc_id`
- Constructs Google Doc URL: `https://docs.google.com/document/d/{google_doc_id}/edit`
- Saves `google_docs_link` to submission in database
- Logs action in audit trail
- Returns `{ success: true, google_doc_url }`

**Error Handling:**
- Validates submission exists and has a file attached
- Checks for MAKE_WEBHOOK_URL environment variable
- Handles webhook failures with detailed error messages
- Comprehensive logging for debugging

### 2. Updated Committee Workflow Route
**File:** `src/app/api/committee-workflow/route.ts`

**Changes:**
- When action is `'review'` AND status is `'with_coordinator'`:
  - Calls `/api/convert-to-gdoc` endpoint internally
  - Passes authentication cookies to maintain session
  - Returns `google_doc_url` in response if conversion succeeds
  - Handles errors and returns appropriate error messages

**Behavior:**
- First "Review" click (New Submissions → Under Review): Changes status only
- Second "Review" click (Under Review): Triggers file conversion and returns Google Doc URL

### 3. Updated Kanban Board Component
**File:** `src/components/committee/kanban-board.tsx`

**Changes:**
- Added state for `googleDocUrl` to control modal display
- After successful workflow action, checks if response contains `google_doc_url`
- If present:
  - Converts URL from `/edit` to `/preview` for iframe embedding
  - Opens Google Doc in modal with iframe
  - Modal includes "Open in New Tab" button for full editing access
- Modal features:
  - Full-width responsive iframe (90vh height, max-width 6xl)
  - Preview mode for quick viewing
  - "Open in New Tab" button to open in edit mode
  - Close button that refreshes the page

**User Experience:**
1. Coordinator clicks "Review" button on submission in "Under Review" column
2. System converts file to Google Doc (shows loading state)
3. Modal opens displaying Google Doc in preview mode
4. User can:
   - View the document directly in the modal
   - Click "Open in New Tab" to edit in full Google Docs interface
   - Close modal to return to kanban board (page refreshes)

## Environment Configuration

### Required Environment Variable
Add to `.env.local`:
```
MAKE_WEBHOOK_URL=https://hook.us1.make.com/your-webhook-id
```

## Make Webhook Expected Response

The Make webhook should return a JSON response with:
```json
{
  "google_doc_id": "1abc123def456..."
}
```

The system will construct the full URL from this ID.

## Error Scenarios Handled

1. **Missing webhook URL**: Returns 500 with "Webhook not configured"
2. **Submission not found**: Returns 404 with "Submission not found"
3. **No file attached**: Returns 400 with "No file attached to submission"
4. **Failed signed URL creation**: Returns 500 with "Failed to create signed URL for file"
5. **Webhook failure**: Returns 500 with webhook error details
6. **Missing google_doc_id in response**: Returns 500 with "Webhook did not return google_doc_id"
7. **Database update failure**: Returns 500 with "Failed to save Google Doc link"

## Logging

Comprehensive logging added with `[Convert to GDoc]` prefix for easy debugging:
- Request validation
- Submission fetch
- Signed URL creation
- Webhook call (with sanitized URL)
- Webhook response
- Database update
- Success/failure states

## Testing Checklist

- [ ] Verify MAKE_WEBHOOK_URL is set in environment
- [ ] Test with valid submission containing a file
- [ ] Verify signed URL is created correctly
- [ ] Confirm webhook receives correct payload
- [ ] Check Google Doc URL is saved to database
- [ ] Verify Google Doc opens in new tab
- [ ] Test error handling for missing files
- [ ] Test error handling for webhook failures
- [ ] Verify audit log entries are created
- [ ] Check permissions (only committee members can access)

## Files Modified

1. `src/app/api/convert-to-gdoc/route.ts` (NEW)
2. `src/app/api/committee-workflow/route.ts` (MODIFIED)
3. `src/components/committee/kanban-board.tsx` (MODIFIED)

## Next Steps

1. Configure MAKE_WEBHOOK_URL in production environment
2. Set up Make scenario to handle file conversion
3. Test end-to-end workflow with real submissions
4. Monitor logs for any issues
5. Consider adding retry logic for webhook failures
6. Add user feedback for long-running conversions
