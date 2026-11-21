-- Course chapter builder: additive schema changes only.
create table if not exists public.course_chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists course_chapters_course_sort_idx
  on public.course_chapters(course_id, sort_order);

create table if not exists public.course_chapter_resources (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.course_chapters(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  resource_type text not null check (resource_type in ('pdf','video')),
  storage_bucket text check (storage_bucket in ('study-pdfs','study-videos')),
  storage_path text not null default '',
  external_url text,
  is_published boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_resource_has_content check (storage_path <> '' or external_url is not null)
);
create index if not exists course_chapter_resources_chapter_idx
  on public.course_chapter_resources(chapter_id, created_at);

alter table public.practice_tests
  add column if not exists course_chapter_id uuid
  references public.course_chapters(id) on delete set null;
create index if not exists practice_tests_course_chapter_idx
  on public.practice_tests(course_chapter_id);

alter table public.course_chapters enable row level security;
alter table public.course_chapter_resources enable row level security;

drop policy if exists "Users read chapters of visible courses" on public.course_chapters;
create policy "Users read chapters of visible courses"
on public.course_chapters for select to authenticated
using (
  exists (
    select 1 from public.courses c
    where c.id = course_chapters.course_id
      and (
        c.is_published
        or c.created_by = (select auth.uid())
        or private.studyguru_is_admin()
      )
  )
);

drop policy if exists "Course owners and admins create chapters" on public.course_chapters;
create policy "Course owners and admins create chapters"
on public.course_chapters for insert to authenticated
with check (
  exists (
    select 1 from public.courses c
    where c.id = course_chapters.course_id
      and (c.created_by = (select auth.uid()) or private.studyguru_is_admin())
  )
);

drop policy if exists "Course owners and admins update chapters" on public.course_chapters;
create policy "Course owners and admins update chapters"
on public.course_chapters for update to authenticated
using (
  exists (
    select 1 from public.courses c
    where c.id = course_chapters.course_id
      and (c.created_by = (select auth.uid()) or private.studyguru_is_admin())
  )
)
with check (
  exists (
    select 1 from public.courses c
    where c.id = course_chapters.course_id
      and (c.created_by = (select auth.uid()) or private.studyguru_is_admin())
  )
);

drop policy if exists "Course owners and admins delete chapters" on public.course_chapters;
create policy "Course owners and admins delete chapters"
on public.course_chapters for delete to authenticated
using (
  exists (
    select 1 from public.courses c
    where c.id = course_chapters.course_id
      and (c.created_by = (select auth.uid()) or private.studyguru_is_admin())
  )
);

drop policy if exists "Users read resources of visible courses" on public.course_chapter_resources;
create policy "Users read resources of visible courses"
on public.course_chapter_resources for select to authenticated
using (
  exists (
    select 1
    from public.course_chapters ch
    join public.courses c on c.id = ch.course_id
    where ch.id = course_chapter_resources.chapter_id
      and (
        (course_chapter_resources.is_published and ch.is_published and c.is_published)
        or c.created_by = (select auth.uid())
        or private.studyguru_is_admin()
      )
  )
);

drop policy if exists "Course owners and admins add resources" on public.course_chapter_resources;
create policy "Course owners and admins add resources"
on public.course_chapter_resources for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.course_chapters ch
    join public.courses c on c.id = ch.course_id
    where ch.id = course_chapter_resources.chapter_id
      and (c.created_by = (select auth.uid()) or private.studyguru_is_admin())
  )
);

drop policy if exists "Course owners and admins update resources" on public.course_chapter_resources;
create policy "Course owners and admins update resources"
on public.course_chapter_resources for update to authenticated
using (
  exists (
    select 1
    from public.course_chapters ch
    join public.courses c on c.id = ch.course_id
    where ch.id = course_chapter_resources.chapter_id
      and (c.created_by = (select auth.uid()) or private.studyguru_is_admin())
  )
)
with check (
  exists (
    select 1
    from public.course_chapters ch
    join public.courses c on c.id = ch.course_id
    where ch.id = course_chapter_resources.chapter_id
      and (c.created_by = (select auth.uid()) or private.studyguru_is_admin())
  )
);

drop policy if exists "Course owners and admins delete resources" on public.course_chapter_resources;
create policy "Course owners and admins delete resources"
on public.course_chapter_resources for delete to authenticated
using (
  exists (
    select 1
    from public.course_chapters ch
    join public.courses c on c.id = ch.course_id
    where ch.id = course_chapter_resources.chapter_id
      and (c.created_by = (select auth.uid()) or private.studyguru_is_admin())
  )
);

-- Preserve the existing standalone test flow while restricting course-linked tests
-- to the owner of the course (or an administrator).
drop policy if exists "Teachers create tests" on public.practice_tests;
create policy "Teachers create tests"
on public.practice_tests for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('teacher','admin')
  )
  and (
    course_chapter_id is null
    or exists (
      select 1
      from public.course_chapters ch
      join public.courses c on c.id = ch.course_id
      where ch.id = practice_tests.course_chapter_id
        and (c.created_by = (select auth.uid()) or private.studyguru_is_admin())
    )
  )
);

drop policy if exists "Teachers update own tests and admins manage tests" on public.practice_tests;
create policy "Teachers update own tests and admins manage tests"
on public.practice_tests for update to authenticated
using (
  (
    created_by = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'teacher')
  )
  or private.studyguru_is_admin()
)
with check (
  (
    created_by = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'teacher')
  )
  or private.studyguru_is_admin()
)
and (
  course_chapter_id is null
  or exists (
    select 1
    from public.course_chapters ch
    join public.courses c on c.id = ch.course_id
    where ch.id = practice_tests.course_chapter_id
      and (c.created_by = (select auth.uid()) or private.studyguru_is_admin())
  )
);

-- Existing policies already allow admins. These additional policies let teachers
-- upload/remove only files inside their own user-id folder.
drop policy if exists "Teachers upload own course files" on storage.objects;
create policy "Teachers upload own course files"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('study-pdfs','study-videos')
  and split_part(name, '/', 1) = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'teacher'
  )
);

drop policy if exists "Teachers delete own course files" on storage.objects;
create policy "Teachers delete own course files"
on storage.objects for delete to authenticated
using (
  bucket_id in ('study-pdfs','study-videos')
  and split_part(name, '/', 1) = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'teacher'
  )
);

drop policy if exists "Students read published course files" on storage.objects;
create policy "Students read published course files"
on storage.objects for select to authenticated
using (
  bucket_id in ('study-pdfs','study-videos')
  and exists (
    select 1
    from public.course_chapter_resources r
    join public.course_chapters ch on ch.id = r.chapter_id
    join public.courses c on c.id = ch.course_id
    where r.storage_bucket = storage.objects.bucket_id
      and r.storage_path = storage.objects.name
      and r.is_published = true
      and ch.is_published = true
      and c.is_published = true
  )
);

-- Students can discover course-linked tests only through published courses/chapters.
drop policy if exists "Users read published tests or own tests" on public.practice_tests;
create policy "Users read published tests or own tests"
on public.practice_tests for select to authenticated
using (
  (
    is_published
    and (
      course_chapter_id is null
      or exists (
        select 1
        from public.course_chapters ch
        join public.courses c on c.id = ch.course_id
        where ch.id = practice_tests.course_chapter_id
          and ch.is_published = true
          and c.is_published = true
      )
    )
  )
  or created_by = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);

drop policy if exists "Students read published course files" on storage.objects;
create policy "Students read published course files"
on storage.objects for select to authenticated
using (
  bucket_id in ('study-pdfs','study-videos')
  and exists (
    select 1
    from public.course_chapter_resources r
    join public.course_chapters ch on ch.id = r.chapter_id
    join public.courses c on c.id = ch.course_id
    where r.storage_bucket = storage.objects.bucket_id
      and r.storage_path = storage.objects.name
      and (
        (r.is_published = true and ch.is_published = true and c.is_published = true)
        or c.created_by = (select auth.uid())
        or private.studyguru_is_admin()
      )
  )
);
