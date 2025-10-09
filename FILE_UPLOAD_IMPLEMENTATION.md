# File Upload Implementation Summary

## Overview

Successfully updated the submission system to use file uploads for both writing and visual art submissions, replacing the previous text input method for writing submissions.

## Changes Made

### Phase 1: Submission Form Updates ✅

**File:** `src/components/forms/submission-form.tsx`

**Changes:**
- Replaced text input field for writing submissions with file upload input
- Added separate file upload handlers for writing and visual submissions
- Added file type validation for writing submissions (.doc, .docx, .pdf, .txt)
- Updated form validation to require files instead of text
- Changed form submission to use FormData instead of JSON
- Maintained separate file state for writing (`writingFile`) and visual (`visualFile`) submissions

**Key Features:**
- File type validation with both MIME type and extension checking
- File size display for selected files
- Clear error messages for invalid file types
- Progress tracking updated to reflect file upload requirements

### Phase 2: Database Schema Updates ✅

**Files:**
- `supabase/migrations/add_file_storage_fields.sql` (new)
- `src/types/database.ts`

**New Database Fields:**
```sql
file_url TEXT          -- Storage path for uploaded files
file_name TEXT         -- Original filename
file_type TEXT         -- MIME type
file_size INTEGER      -- File size in bytes
```

**Notes:**
- `text_body` field kept for backward compatibility (marked as deprecated)
- All new fields added to TypeScript types for type safety

### Phase 3: API & Storage Updates ✅

**Files:**
- `src/lib/storage.ts`
- `src/app/api/submissions/route.ts`

**Storage Updates:**
- Added `SUBMISSIONS_BUCKET` constant for writing submissions
- Updated `createSignedUrl()` to accept bucket parameter
- Added `uploadFile()` function for file uploads
- Added `getSubmissionsBucketName()` helper function

**API Updates:**
- Changed from JSON to FormData handling
- Added file upload to Supabase Storage
- Added file type validation on server side
- Added file size validation (10MB limit)
- Store file metadata in database
- Separate bucket handling for writing vs visual submissions

**Storage Buckets:**
- Writing submissions → `submissions` bucket
- Visual art → `art` bucket

### Phase 4: Make Webhook Documentation ✅

**File:** `MAKE_WEBHOOK_INTEGRATION.md` (new)

**Documentation Includes:**
- Complete Make webhook setup guide
- Frontend implementation examples
- Backend API endpoint templates
- Storage bucket configuration
- RLS policy examples
- Testing checklist
- Future enhancement ideas

## File Structure

```
your-repo/
├── src/
│   ├── components/
│   │   └── forms/
│   │       └── submission-form.tsx          [MODIFIED]
│   ├── lib/
│   │   └── storage.ts                       [MODIFIED]
│   ├── types/
│   │   └── database.ts                      [MODIFIED]
│   └── app/
│       └── api/
│           └── submissions/
│               └── route.ts                 [MODIFIED]
├── supabase/
│   └── migrations/
│       └── add_file_storage_fields.sql      [NEW]
├── FILE_UPLOAD_IMPLEMENTATION.md            [NEW - this file]
└── MAKE_WEBHOOK_INTEGRATION.md              [NEW]
```

## Migration Steps

### 1. Database Migration

Run the migration to add new fields:
```bash
# Apply migration to your Supabase project
supabase db push
```

Or manually run the SQL:
```sql
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER;
```

### 2. Storage Bucket Setup

Create the `submissions` bucket in Supabase Storage:

1. Go to Supabase Dashboard → Storage
2. Create new bucket: `submissions`
3. Set as private (not public)
4. Configure file size limit: 10MB
5. Set up RLS policies (see MAKE_WEBHOOK_INTEGRATION.md)

### 3. Environment Variables

No new environment variables needed for Phases 1-3.

For Phase 4 (Make webhook), add:
```bash
MAKE_WEBHOOK_URL=https://hook.us1.make.com/xxxxxxxxxxxxxxxxx
```

## Testing

### Manual Testing Steps

1. **Writing Submission:**
   - Go to `/submit`
   - Select "Writing" type
   - Choose a category
   - Enter preferred name
   - Upload a .docx file
   - Submit form
   - Verify file appears in `submissions` bucket
   - Check database for file metadata

2. **Visual Art Submission:**
   - Go to `/submit`
   - Select "Visual Art" type
   - Choose a category
   - Enter preferred name
   - Upload an image file
   - Submit form
   - Verify file appears in `art` bucket
   - Check database for file metadata

3. **File Type Validation:**
   - Try uploading invalid file types
   - Verify error messages appear
   - Try files over 10MB
   - Verify size limit error

### Database Verification

```sql
-- Check recent submissions
SELECT 
  id,
  title,
  type,
  file_name,
  file_type,
  file_size,
  file_url,
  created_at
FROM submissions
ORDER BY created_at DESC
LIMIT 10;
```

## Backward Compatibility

- Existing submissions with `text_body` will continue to work
- New submissions will use `file_url` instead
- `text_body` field is kept but marked as deprecated
- Future: Can extract text from uploaded files and populate `text_body`

## Next Steps (Phase 4 Implementation)

To complete the Make webhook integration:

1. Create Make scenario for document conversion
2. Create API endpoint: `/api/submissions/[id]/signed-url`
3. Create API endpoint: `/api/submissions/convert-to-docs`
4. Add "Edit Docs" button to committee kanban board
5. Test full conversion flow

See `MAKE_WEBHOOK_INTEGRATION.md` for detailed instructions.

## Security Considerations

- Files stored with user ID prefix: `{userId}/{timestamp}-{filename}`
- RLS policies ensure users can only access their own files
- Committee members can access all submission files
- Signed URLs expire after specified time (default: 7 days, 1 hour for conversions)
- File type validation on both client and server
- File size limits enforced

## Performance Notes

- File uploads handled via FormData (efficient for large files)
- Files stored in Supabase Storage (CDN-backed)
- Signed URLs cached for performance
- No impact on existing text-based submissions

## Known Limitations

1. Maximum file size: 10MB
2. Supported writing formats: .doc, .docx, .pdf, .txt
3. No batch upload support (one file per submission)
4. No file preview before submission
5. No drag-and-drop upload (can be added later)

## Future Enhancements

1. **File Preview:** Show preview of uploaded files before submission
2. **Drag & Drop:** Add drag-and-drop file upload interface
3. **Multiple Files:** Support multiple file uploads per submission
4. **Text Extraction:** Automatically extract text from uploaded documents
5. **File Compression:** Compress large files before upload
6. **Progress Indicator:** Show upload progress for large files
7. **File Versioning:** Track multiple versions of submitted files
8. **Direct Editing:** Edit documents directly in the browser

## Troubleshooting

### File Upload Fails

**Issue:** File upload returns 500 error

**Solutions:**
- Check Supabase Storage is configured
- Verify bucket exists (`submissions` or `art`)
- Check RLS policies allow uploads
- Verify file size is under 10MB
- Check file type is allowed

### Files Not Appearing in Storage

**Issue:** Submission succeeds but file not in bucket

**Solutions:**
- Check bucket name matches code
- Verify storage policies
- Check user authentication
- Review server logs for errors

### Invalid File Type Error

**Issue:** Valid file rejected as invalid type

**Solutions:**
- Check MIME type matches allowed types
- Verify file extension is correct
- Some files may have incorrect MIME types
- Add additional MIME types if needed

## Support

For issues or questions:
1. Check this documentation
2. Review `MAKE_WEBHOOK_INTEGRATION.md`
3. Check Supabase Storage logs
4. Review browser console for errors
5. Check server logs for API errors
