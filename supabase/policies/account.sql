-- Create public avatars bucket (no-op if exists)
insert into storage.buckets (id, name, public) values ('avatars','avatars', true)
on conflict (id) do nothing;

-- Allow anyone to read avatars
create policy "avatars read" on storage.objects for select using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload to avatars
create policy "avatars insert auth" on storage.objects for insert to authenticated with check ( bucket_id = 'avatars' );

-- Allow owners to update/delete their own objects
create policy "avatars update own" on storage.objects for update to authenticated using ( bucket_id='avatars' and owner = auth.uid() );
create policy "avatars delete own" on storage.objects for delete to authenticated using ( bucket_id='avatars' and owner = auth.uid() );

-- Profiles: allow users to read/update their own row
create policy "profiles read own" on public.profiles for select using ( auth.uid() = id );
create policy "profiles upsert own" on public.profiles for insert with check ( auth.uid() = id );
create policy "profiles update own" on public.profiles for update using ( auth.uid() = id ) with check ( auth.uid() = id );
