begin;

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text,
  role text check (role in ('student', 'editor', 'admin')) default 'student',
  created_at timestamptz default timezone('utc', now())
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null check (type in ('writing', 'visual')),
  genre text,
  summary text,
  content_warnings text,
  word_count int,
  text_body text,
  art_files jsonb default '[]'::jsonb,
  cover_image text,
  status text not null default 'submitted' check (status in ('submitted','in_review','needs_revision','accepted','declined','published')),
  assigned_editor uuid references auth.users(id) on delete set null,
  editor_notes text,
  decision_date timestamptz,
  published boolean default false,
  published_url text,
  issue text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  action text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default timezone('utc', now())
);

create index if not exists submissions_owner_idx on public.submissions(owner_id);
create index if not exists submissions_status_idx on public.submissions(status);
create index if not exists submissions_published_idx on public.submissions(published);
create index if not exists audit_log_submission_idx on public.audit_log(submission_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger update_submissions_timestamp
  before update on public.submissions
  for each row execute procedure public.touch_updated_at();

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

commit;
