# Make Webhook Integration Guide

This document outlines how to integrate Make.com webhooks for converting uploaded submission files to Google Docs.

## Overview

The "Edit Docs" button functionality will:
1. Take the uploaded file URL from a submission
2. Send it to a Make webhook
3. Make converts the file to a Google Doc in your shared drive
4. Returns the Google Doc URL
5. Store that URL in the submission's `google_docs_link` field

## Current Implementation Status

### ✅ Completed (Phases 1-3)
- [x] Submission form updated to use file uploads for writing submissions
- [x] Database schema updated with file storage fields (`file_url`, `file_name`, `file_type`, `file_size`)
- [x] API endpoint handles file uploads to Supabase Storage
- [x] Files are stored in appropriate buckets:
  - Writing submissions → `submissions` bucket
  - Visual art → `art` bucket

### 🔄 Ready for Implementation (Phase 4)

## Database Schema

The submissions table already has the necessary field:
```sql
google_docs_link TEXT -- Stores the Google Doc URL after conversion
```

Additional fields available:
- `file_url` - Path to the uploaded file in Supabase Storage
- `file_name` - Original filename
- `file_type` - MIME type of the file
- `file_size` - File size in bytes

## Make Webhook Setup

### 1. Create Make Scenario

Your Make scenario should:

**Trigger:** Webhook (Receive data)
- Method: POST
- Expected data structure:
```json
{
  "submissionId": "uuid",
  "fileUrl": "https://your-supabase-project.supabase.co/storage/v1/object/sign/submissions/...",
  "fileName": "original-filename.docx",
  "fileType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}
```

**Actions:**
1. Download the file from the signed URL
2. Upload to Google Drive (in your shared drive)
3. Convert to Google Docs format
4. Get the shareable link
5. Return response:
```json
{
  "success": true,
  "googleDocsUrl": "https://docs.google.com/document/d/...",
  "submissionId": "uuid"
}
```

### 2. Webhook URL

Once you create the Make scenario, you'll get a webhook URL like:
```
https://hook.us1.make.com/xxxxxxxxxxxxxxxxx
```

Store this in your environment variables:
```bash
MAKE_WEBHOOK_URL=https://hook.us1.make.com/xxxxxxxxxxxxxxxxx
```

## Frontend Implementation

### Location: Committee Kanban Board

The "Edit Docs" button should be added to the submission cards in the committee workflow.

**File to modify:** `your-repo/src/components/committee/kanban-board.tsx`

### Implementation Steps

1. **Add Edit Docs Button**
   - Show button for writing submissions that have a `file_url`
   - Button should be visible to committee members with appropriate permissions

2. **Button Click Handler**
   ```typescript
   async function handleEditDocs(submission: Submission) {
     try {
       // Show loading state
       setIsConverting(submission.id);
       
       // Create signed URL for the file (valid for 1 hour)
       const signedUrlResponse = await fetch(`/api/submissions/${submission.id}/signed-url`);
       const { signedUrl } = await signedUrlResponse.json();
       
       // Call Make webhook
       const response = await fetch('/api/submissions/convert-to-docs', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           submissionId: submission.id,
           fileUrl: signedUrl,
           fileName: submission.file_name,
           fileType: submission.file_type,
         }),
       });
       
       const result = await response.json();
       
       if (result.success) {
         // Show success message
         showSuccess('Document converted! Opening Google Docs...');
         // Open Google Docs in new tab
         window.open(result.googleDocsUrl, '_blank');
         // Refresh submission data
         refreshSubmissions();
       }
     } catch (error) {
       showError('Failed to convert document. Please try again.');
     } finally {
       setIsConverting(null);
     }
   }
   ```

## Backend API Endpoints to Create

### 1. Get Signed URL for File

**File:** `your-repo/src/app/api/submissions/[id]/signed-url/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route';
import { createSignedUrl, getSubmissionsBucketName } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get submission
  const { data: submission, error } = await supabase
    .from('submissions')
    .select('file_url, type')
    .eq('id', params.id)
    .single();

  if (error || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  if (!submission.file_url) {
    return NextResponse.json({ error: 'No file attached' }, { status: 400 });
  }

  // Create signed URL (valid for 1 hour)
  const bucket = submission.type === 'writing' 
    ? getSubmissionsBucketName() 
    : getBucketName();
  
  const signedUrl = await createSignedUrl(
    submission.file_url,
    3600, // 1 hour
    bucket
  );

  if (!signedUrl) {
    return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl });
}
```

### 2. Convert to Google Docs (Make Webhook Proxy)

**File:** `your-repo/src/app/api/submissions/convert-to-docs/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route';

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Add permission check for committee members

  const body = await request.json();
  const { submissionId, fileUrl, fileName, fileType } = body;

  if (!submissionId || !fileUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // Call Make webhook
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
    
    if (!makeWebhookUrl) {
      return NextResponse.json({ 
        error: 'Make webhook not configured' 
      }, { status: 500 });
    }

    const makeResponse = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId,
        fileUrl,
        fileName,
        fileType,
      }),
    });

    if (!makeResponse.ok) {
      throw new Error('Make webhook failed');
    }

    const makeResult = await makeResponse.json();

    // Update submission with Google Docs link
    const { error: updateError } = await supabase
      .from('submissions')
      .update({ 
        google_docs_link: makeResult.googleDocsUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Failed to update submission:', updateError);
    }

    return NextResponse.json({
      success: true,
      googleDocsUrl: makeResult.googleDocsUrl,
      submissionId,
    });
  } catch (error) {
    console.error('Convert to docs error:', error);
    return NextResponse.json({ 
      error: 'Failed to convert document' 
    }, { status: 500 });
  }
}
```

## Environment Variables

Add to `.env.local`:
```bash
# Make.com webhook for converting submissions to Google Docs
MAKE_WEBHOOK_URL=https://hook.us1.make.com/xxxxxxxxxxxxxxxxx
```

## Storage Bucket Setup

Ensure the following buckets exist in Supabase Storage:

1. **submissions** bucket (for writing submissions)
   - Public: No
   - File size limit: 10MB
   - Allowed MIME types: 
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `application/pdf`
     - `text/plain`

2. **art** bucket (for visual art submissions)
   - Public: No
   - File size limit: 10MB
   - Allowed MIME types: `image/*`, `application/pdf`

### Storage Policies

Both buckets need RLS policies:

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow committee members to read all files
CREATE POLICY "Committee can read all files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submissions' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND 'committee' = ANY(roles)
  )
);
```

## Testing Checklist

- [ ] Create submissions bucket in Supabase Storage
- [ ] Set up storage policies
- [ ] Upload a writing submission (.docx file)
- [ ] Verify file is stored in `submissions` bucket
- [ ] Create Make scenario
- [ ] Test Make webhook manually with sample data
- [ ] Add MAKE_WEBHOOK_URL to environment variables
- [ ] Create API endpoints for signed URL and conversion
- [ ] Add "Edit Docs" button to committee kanban board
- [ ] Test full flow: upload → convert → open Google Doc
- [ ] Verify `google_docs_link` is saved to database

## Future Enhancements

1. **Batch Conversion**: Convert multiple submissions at once
2. **Status Tracking**: Show conversion progress/status
3. **Error Handling**: Retry failed conversions
4. **Notifications**: Email committee when conversion completes
5. **Version History**: Track multiple Google Doc versions
6. **Direct Editing**: Edit Google Docs inline (iframe embed)

## Notes

- The `text_body` field is kept for backward compatibility but is now deprecated
- Files are stored with user ID prefix for security: `{userId}/{timestamp}-{filename}`
- Signed URLs expire after 1 hour for security
- Make webhook should handle various document formats (.doc, .docx, .pdf, .txt)
