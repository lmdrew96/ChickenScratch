begin;

alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.audit_log enable row level security;

create policy if not exists "Profiles are viewable by owner or staff"
  on public.profiles
  for select
  using (
    id = auth.uid()
    or public.current_app_role() in ('editor', 'admin')
  );

create policy if not exists "Profiles are updatable by owner"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy if not exists "Profiles are manageable by admin"
  on public.profiles
  for all
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy if not exists "Students can insert their submissions"
  on public.submissions
  for insert
  with check (owner_id = auth.uid());

create policy if not exists "Owners, editors, admins and published can be read"
  on public.submissions
  for select
  using (
    owner_id = auth.uid()
    or public.current_app_role() in ('editor', 'admin')
    or published is true
  );

create policy if not exists "Students can update editable submissions"
  on public.submissions
  for update
  using (owner_id = auth.uid() and status in ('submitted', 'needs_revision'))
  with check (owner_id = auth.uid() and status in ('submitted', 'needs_revision'));

create policy if not exists "Editors and admins can update submissions"
  on public.submissions
  for update
  using (public.current_app_role() in ('editor', 'admin'))
  with check (public.current_app_role() in ('editor', 'admin'));

create policy if not exists "Admins can delete submissions"
  on public.submissions
  for delete
  using (public.current_app_role() = 'admin');

create policy if not exists "Editors and admins can insert audit logs"
  on public.audit_log
  for insert
  with check (public.current_app_role() in ('editor', 'admin'));

create policy if not exists "Staff or owners can read audit logs"
  on public.audit_log
  for select
  using (
    public.current_app_role() in ('editor', 'admin')
    or exists (
      select 1
      from public.submissions s
      where s.id = audit_log.submission_id and s.owner_id = auth.uid()
    )
  );

commit;
