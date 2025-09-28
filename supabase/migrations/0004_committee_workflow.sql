begin;

-- Update the profiles table to support new roles
alter table public.profiles 
drop constraint if exists profiles_role_check;

alter table public.profiles 
add constraint profiles_role_check 
check (role in (
  'student', 
  'editor', 
  'admin',
  -- Officer roles
  'bbeg',
  'dictator_in_chief', 
  'scroll_gremlin',
  'chief_hoarder',
  'pr_nightmare',
  -- Committee roles
  'editor_in_chief',
  'submissions_coordinator',
  'proofreader', 
  'lead_design'
));

-- Add new fields to submissions table for committee workflow
alter table public.submissions add column if not exists committee_status text 
check (committee_status in (
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
)) default 'pending_coordinator';

-- Add fields for workflow tracking
alter table public.submissions add column if not exists google_docs_link text;
alter table public.submissions add column if not exists lead_design_commit_link text;
alter table public.submissions add column if not exists committee_comments jsonb default '[]'::jsonb;
alter table public.submissions add column if not exists workflow_step text default 'coordinator';
alter table public.submissions add column if not exists decline_reason text;

-- Add fields for file versioning and tracking
alter table public.submissions add column if not exists original_files jsonb default '[]'::jsonb;
alter table public.submissions add column if not exists current_version integer default 1;
alter table public.submissions add column if not exists version_history jsonb default '[]'::jsonb;

-- Add coordinator assignment
alter table public.submissions add column if not exists assigned_coordinator uuid references auth.users(id) on delete set null;
alter table public.submissions add column if not exists assigned_proofreader uuid references auth.users(id) on delete set null;
alter table public.submissions add column if not exists assigned_lead_design uuid references auth.users(id) on delete set null;
alter table public.submissions add column if not exists assigned_editor_in_chief uuid references auth.users(id) on delete set null;

-- Add timestamps for workflow tracking
alter table public.submissions add column if not exists coordinator_reviewed_at timestamptz;
alter table public.submissions add column if not exists proofreader_committed_at timestamptz;
alter table public.submissions add column if not exists lead_design_committed_at timestamptz;
alter table public.submissions add column if not exists editor_reviewed_at timestamptz;

-- Create index for committee workflow queries
create index if not exists submissions_committee_status_idx on public.submissions(committee_status);
create index if not exists submissions_workflow_step_idx on public.submissions(workflow_step);
create index if not exists submissions_coordinator_idx on public.submissions(assigned_coordinator);
create index if not exists submissions_proofreader_idx on public.submissions(assigned_proofreader);
create index if not exists submissions_lead_design_idx on public.submissions(assigned_lead_design);
create index if not exists submissions_editor_in_chief_idx on public.submissions(assigned_editor_in_chief);

-- Update the current_app_role function to handle new roles
create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select case
    when auth.uid() is null then null
    else coalesce((select role from public.profiles where id = auth.uid()), 'student')
  end;
$$;

-- Helper function to check if user has officer role
create or replace function public.is_officer_role(user_role text)
returns boolean
language sql
stable
as $$
  select user_role in ('bbeg', 'dictator_in_chief', 'scroll_gremlin', 'chief_hoarder', 'pr_nightmare');
$$;

-- Helper function to check if user has committee role  
create or replace function public.is_committee_role(user_role text)
returns boolean
language sql
stable
as $$
  select user_role in ('editor_in_chief', 'submissions_coordinator', 'proofreader', 'lead_design');
$$;

-- Function to get user's committee role permissions
create or replace function public.get_committee_permissions(user_role text)
returns jsonb
language sql
stable
as $$
  select case user_role
    when 'submissions_coordinator' then '{"can_view_new": true, "can_approve_decline": true, "can_assign": true}'::jsonb
    when 'proofreader' then '{"can_view_writing": true, "can_edit_docs": true, "can_commit": true}'::jsonb  
    when 'lead_design' then '{"can_view_visual": true, "can_view_proofread": true, "can_upload_canva": true, "can_commit": true}'::jsonb
    when 'editor_in_chief' then '{"can_view_committed": true, "can_final_approve": true, "can_final_decline": true}'::jsonb
    else '{}'::jsonb
  end;
$$;

commit;