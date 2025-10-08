-- Create meeting_proposals table
CREATE TABLE IF NOT EXISTS meeting_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  proposed_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  finalized_date TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create officer_availability table
CREATE TABLE IF NOT EXISTS officer_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_proposal_id UUID NOT NULL REFERENCES meeting_proposals(id) ON DELETE CASCADE,
  available_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, meeting_proposal_id)
);

-- Create officer_tasks table
CREATE TABLE IF NOT EXISTS officer_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create officer_announcements table
CREATE TABLE IF NOT EXISTS officer_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meeting_proposals_created_by ON meeting_proposals(created_by);
CREATE INDEX IF NOT EXISTS idx_meeting_proposals_finalized_date ON meeting_proposals(finalized_date);
CREATE INDEX IF NOT EXISTS idx_officer_availability_user_id ON officer_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_officer_availability_meeting_proposal_id ON officer_availability(meeting_proposal_id);
CREATE INDEX IF NOT EXISTS idx_officer_tasks_assigned_to ON officer_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_officer_tasks_created_by ON officer_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_officer_tasks_status ON officer_tasks(status);
CREATE INDEX IF NOT EXISTS idx_officer_tasks_due_date ON officer_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_officer_announcements_created_at ON officer_announcements(created_at DESC);

-- Enable Row Level Security
ALTER TABLE meeting_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_proposals
CREATE POLICY "Officers can view all meeting proposals"
  ON meeting_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.roles @> '["officer"]'::jsonb
        OR user_roles.positions ?| ARRAY['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare']
      )
    )
  );

CREATE POLICY "Officers can create meeting proposals"
  ON meeting_proposals FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.roles @> '["officer"]'::jsonb
        OR user_roles.positions ?| ARRAY['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare']
      )
    )
  );

CREATE POLICY "Officers can update meeting proposals"
  ON meeting_proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.roles @> '["officer"]'::jsonb
        OR user_roles.positions ?| ARRAY['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare']
      )
    )
  );

-- RLS Policies for officer_availability
CREATE POLICY "Officers can view all availability"
  ON officer_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.roles @> '["officer"]'::jsonb
        OR user_roles.positions ?| ARRAY['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare']
      )
    )
  );

CREATE POLICY "Officers can manage their own availability"
  ON officer_availability FOR ALL
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.roles @> '["officer"]'::jsonb
        OR user_roles.positions ?| ARRAY['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare']
      )
    )
  );

-- RLS Policies for officer_tasks
CREATE POLICY "Officers can view all tasks"
  ON officer_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.roles @> '["officer"]'::jsonb
        OR user_roles.positions ?| ARRAY['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare']
      )
    )
  );

CREATE POLICY "Officers can create tasks"
  ON officer_tasks FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.roles @> '["officer"]'::jsonb
        OR user_roles.positions ?| ARRAY['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare']
      )
    )
  );

CREATE POLICY "Officers can update tasks"
  ON officer_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.roles @> '["officer"]'::jsonb
        OR user_roles.positions ?| ARRAY['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare']
      )
    )
  );

CREATE POLICY "Officers can delete tasks"
  ON officer_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.roles @> '["officer"]'::jsonb
        OR user_roles.positions ?| ARRAY['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare']
      )
    )
  );

-- RLS Policies for officer_announcements
CREATE POLICY "Officers can view all announcements"
  ON officer_announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.roles @> '["officer"]'::jsonb
        OR user_roles.positions ?| ARRAY['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare']
      )
    )
  );

CREATE POLICY "Officers can create announcements"
  ON officer_announcements FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.roles @> '["officer"]'::jsonb
        OR user_roles.positions ?| ARRAY['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare']
      )
    )
  );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_meeting_proposals_updated_at
  BEFORE UPDATE ON meeting_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_officer_availability_updated_at
  BEFORE UPDATE ON officer_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_officer_tasks_updated_at
  BEFORE UPDATE ON officer_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
