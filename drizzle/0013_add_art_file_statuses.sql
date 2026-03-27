ALTER TABLE submissions ADD COLUMN IF NOT EXISTS art_file_statuses JSONB DEFAULT '{}';
