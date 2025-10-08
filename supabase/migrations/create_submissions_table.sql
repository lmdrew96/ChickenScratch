-- Create submissions table with all required columns
CREATE TABLE IF NOT EXISTS public.submissions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner and basic info
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('writing', 'visual')),
  
  -- Content fields
  genre TEXT,
  summary TEXT,
  content_warnings TEXT,
  word_count INTEGER,
  text_body TEXT,
  art_files JSONB DEFAULT '[]'::jsonb,
  cover_image TEXT,
  
  -- Status and workflow
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted',
    'in_review',
    'needs_revision',
    'accepted',
    'declined',
    'published'
  )),
  
  -- Editor assignment
  assigned_editor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  editor_notes TEXT,
  decision_date TIMESTAMPTZ,
  
  -- Publishing fields
  published BOOLEAN DEFAULT false,
  published_url TEXT,
  issue TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Committee workflow fields
  committee_status TEXT CHECK (committee_status IN (
    'pending_coordinator',
    'with_coordinator',
    'coordinator_approved',
    'coordinator_declined',
    'with_proofreader',
    'proofreader_committed',
    'with_lead_design',
    'lead_design_committed',
    'with_editor_in_chief',
    'editor_approved',
    'editor_declined',
    'final_committee_review'
  )),
  google_docs_link TEXT,
  lead_design_commit_link TEXT,
  committee_comments JSONB DEFAULT '[]'::jsonb,
  workflow_step TEXT,
  decline_reason TEXT,
  
  -- Version control
  original_files JSONB DEFAULT '[]'::jsonb,
  current_version INTEGER DEFAULT 1,
  version_history JSONB DEFAULT '[]'::jsonb,
  
  -- Committee member assignments
  assigned_coordinator UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_proofreader UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_lead_design UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_editor_in_chief UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Committee review timestamps
  coordinator_reviewed_at TIMESTAMPTZ,
  proofreader_committed_at TIMESTAMPTZ,
  lead_design_committed_at TIMESTAMPTZ,
  editor_reviewed_at TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_submissions_owner_id ON public.submissions(owner_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_assigned_editor ON public.submissions(assigned_editor);
CREATE INDEX IF NOT EXISTS idx_submissions_published ON public.submissions(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_submissions_committee_status ON public.submissions(committee_status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- 1. Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON public.submissions
  FOR SELECT
  USING (auth.uid() = owner_id);

-- 2. Users can insert their own submissions
CREATE POLICY "Users can create own submissions"
  ON public.submissions
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- 3. Users can update their own submissions (but only certain fields)
CREATE POLICY "Users can update own submissions"
  ON public.submissions
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 4. Officers and committee members can view all submissions
CREATE POLICY "Officers and committee can view all submissions"
  ON public.submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        'officer' = ANY(user_roles.roles)
        OR 'committee' = ANY(user_roles.roles)
      )
    )
  );

-- 5. Officers and committee members can update submissions
CREATE POLICY "Officers and committee can update submissions"
  ON public.submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        'officer' = ANY(user_roles.roles)
        OR 'committee' = ANY(user_roles.roles)
      )
    )
  );

-- 6. Public can view published submissions
CREATE POLICY "Anyone can view published submissions"
  ON public.submissions
  FOR SELECT
  USING (published = true AND status = 'published');

-- 7. Committee members can view submissions in their workflow
CREATE POLICY "Committee can view assigned submissions"
  ON public.submissions
  FOR SELECT
  USING (
    auth.uid() IN (
      assigned_coordinator,
      assigned_proofreader,
      assigned_lead_design,
      assigned_editor_in_chief
    )
  );

-- Create foreign key constraint name for the assigned_editor relationship
-- This matches the relationship name used in the API route
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_assigned_editor_fkey;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_assigned_editor_fkey
  FOREIGN KEY (assigned_editor)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.submissions TO authenticated;
GRANT SELECT ON public.submissions TO anon;

-- Add comment to table
COMMENT ON TABLE public.submissions IS 'Stores all literary magazine submissions with workflow and publishing information';
