-- StudyGuru engagement, admin overview and scheduled live tests
create table if not exists public.study_content_likes (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('course','live_class')),
  content_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(content_type, content_id, user_id)
);
create table if not exists public.study_content_comments (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('course','live_class')),
  content_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1200),
  created_at timestamptz not null default now()
);
create table if not exists public.study_content_views (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('course','live_class')),
  content_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  viewed_on date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  unique(content_type, content_id, user_id, viewed_on)
);
create table if not exists public.study_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('login','view','test_attempt','comment','like')),
  content_type text,
  content_id uuid,
  created_at timestamptz not null default now()
);
create table if not exists public.live_test_sessions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.practice_tests(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_published boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint live_test_sessions_time_check check (ends_at > starts_at)
);
create index if not exists study_comments_content_idx on public.study_content_comments(content_type,content_id,created_at desc);
create index if not exists study_events_type_time_idx on public.study_activity_events(event_type,created_at desc);
create index if not exists live_test_sessions_start_idx on public.live_test_sessions(starts_at);
alter table public.study_content_likes enable row level security;
alter table public.study_content_comments enable row level security;
alter table public.study_content_views enable row level security;
alter table public.study_activity_events enable row level security;
alter table public.live_test_sessions enable row level security;
create policy "likes readable by authenticated" on public.study_content_likes for select to authenticated using (true);
create policy "users manage own likes" on public.study_content_likes for insert to authenticated with check (user_id = auth.uid());
create policy "users remove own likes" on public.study_content_likes for delete to authenticated using (user_id = auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "comments readable by authenticated" on public.study_content_comments for select to authenticated using (true);
create policy "users add own comments" on public.study_content_comments for insert to authenticated with check (user_id = auth.uid());
create policy "users delete own comments or admin" on public.study_content_comments for delete to authenticated using (user_id = auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "views readable by admin" on public.study_content_views for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "users insert own views" on public.study_content_views for insert to authenticated with check (user_id = auth.uid());
create policy "events readable by admin" on public.study_activity_events for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "users insert own events" on public.study_activity_events for insert to authenticated with check (user_id = auth.uid());
create policy "live test sessions readable" on public.live_test_sessions for select to authenticated using (is_published = true or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','teacher')));
create policy "teachers create live test sessions" on public.live_test_sessions for insert to authenticated with check (created_by=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','teacher')));
create policy "teachers update live test sessions" on public.live_test_sessions for update to authenticated using (created_by=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')) with check (created_by=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "teachers delete live test sessions" on public.live_test_sessions for delete to authenticated using (created_by=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
