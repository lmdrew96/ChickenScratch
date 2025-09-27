begin;

-- Update profiles policy to include new roles
drop policy if exists "Profiles are viewable by owner or staff" on public.profiles;
create policy "Profiles are viewable by owner or staff"
  on public.profiles
  for select
  using (
    id = auth.uid()
    or public.current_app_role() in ('editor', 'admin')
    or public.is_officer_role(public.current_app_role())
    or public.is_committee_role(public.current_app_role())
  );

-- Update submissions read policy to include committee and officer roles  
drop policy if exists "Owners, editors, admins and published can be read" on public.submissions;
create policy "Owners, editors, admins and published can be read"
  on public.submissions
  for select
  using (
    owner_id = auth.uid()
    or public.current_app_role() in ('editor', 'admin')
    or public.is_officer_role(public.current_app_role())
    or public.is_committee_role(public.current_app_role())
    or published is true
  );

-- Update submissions update policy to include committee roles
drop policy if exists "Editors and admins can update submissions" on public.submissions;
create policy "Editors and admins can update submissions"
  on public.submissions
  for update
  using (
    public.current_app_role() in ('editor', 'admin')
    or public.is_officer_role(public.current_app_role())
    or public.is_committee_role(public.current_app_role())
  )
  with check (
    public.current_app_role() in ('editor', 'admin')
    or public.is_officer_role(public.current_app_role())
    or public.is_committee_role(public.current_app_role())
  );

-- Committee-specific submission access policies
create policy if not exists "Submissions coordinator can see all submitted"
  on public.submissions
  for select
  using (
    public.current_app_role() = 'submissions_coordinator'
    and status = 'submitted'
  );

create policy if not exists "Proofreader can see assigned writing submissions"
  on public.submissions
  for select
  using (
    public.current_app_role() = 'proofreader'
    and type = 'writing'
    and (committee_status in ('with_proofreader', 'proofreader_committed')
         or assigned_proofreader = auth.uid())
  );

create policy if not exists "Lead design can see visual and proofread submissions"
  on public.submissions
  for select
  using (
    public.current_app_role() = 'lead_design'
    and (
      (type = 'visual' and committee_status = 'with_lead_design')
      or committee_status = 'proofreader_committed'
      or assigned_lead_design = auth.uid()
    )
  );

create policy if not exists "Editor-in-chief can see committed submissions"  
  on public.submissions
  for select
  using (
    public.current_app_role() = 'editor_in_chief'
    and committee_status in ('with_editor_in_chief', 'editor_approved', 'editor_declined')
  );

-- Update audit log policies to include new roles
drop policy if exists "Editors and admins can insert audit logs" on public.audit_log;
create policy "Staff can insert audit logs"
  on public.audit_log
  for insert
  with check (
    public.current_app_role() in ('editor', 'admin')
    or public.is_officer_role(public.current_app_role())
    or public.is_committee_role(public.current_app_role())
  );

drop policy if exists "Staff or owners can read audit logs" on public.audit_log;
create policy "Staff or owners can read audit logs"
  on public.audit_log
  for select
  using (
    public.current_app_role() in ('editor', 'admin')
    or public.is_officer_role(public.current_app_role())
    or public.is_committee_role(public.current_app_role())
    or exists (
      select 1
      from public.submissions s
      where s.id = audit_log.submission_id and s.owner_id = auth.uid()
    )
  );

commit;