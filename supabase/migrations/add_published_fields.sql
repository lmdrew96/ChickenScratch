-- Add published_url and issue columns to submissions table if they don't exist
DO $$ 
BEGIN
  -- Add published_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'submissions' AND column_name = 'published_url'
  ) THEN
    ALTER TABLE submissions ADD COLUMN published_url TEXT;
  END IF;

  -- Add issue column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'submissions' AND column_name = 'issue'
  ) THEN
    ALTER TABLE submissions ADD COLUMN issue TEXT;
  END IF;
END $$;
