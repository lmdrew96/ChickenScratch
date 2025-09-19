begin;

insert into storage.buckets (id, name, public)
values ('art', 'art', false)
on conflict (id) do nothing;

create policy if not exists "Users can upload art into their namespace"
  on storage.objects
  for insert
  with check (
    bucket_id = 'art'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy if not exists "Owners can read their art files"
  on storage.objects
  for select
  using (
    bucket_id = 'art'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy if not exists "Owners can update their art files"
  on storage.objects
  for update
  using (
    bucket_id = 'art'
    and auth.uid()::text = split_part(name, '/', 1)
  )
  with check (
    bucket_id = 'art'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy if not exists "Editors and admins can view art files"
  on storage.objects
  for select
  using (
    bucket_id = 'art' and public.current_app_role() in ('editor', 'admin')
  );

commit;
