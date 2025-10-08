-- Add file storage fields to submissions table
-- This migration adds support for storing uploaded files instead of text bodies

-- Add new columns for file storage
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Add comment to explain the migration
COMMENT ON COLUMN submissions.file_url IS 'Storage path/URL for uploaded submission files (writing docs, visual art)';
COMMENT ON COLUMN submissions.file_name IS 'Original filename of the uploaded file';
COMMENT ON COLUMN submissions.file_type IS 'MIME type of the uploaded file';
COMMENT ON COLUMN submissions.file_size IS 'File size in bytes';

-- Note: We're keeping text_body for backward compatibility and for any text that might be extracted
-- from uploaded documents. It can be deprecated later once all submissions use file uploads.
COMMENT ON COLUMN submissions.text_body IS 'DEPRECATED: Text content (kept for backward compatibility, will be extracted from files)';
