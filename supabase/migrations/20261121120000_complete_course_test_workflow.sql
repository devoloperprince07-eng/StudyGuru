-- StudyGuru Production migration: chapter builder, course resources and secure result scoring.
-- Applied to the original StudyGuru Supabase project.

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
create index if not exists course_chapters_course_order_idx on public.course_chapters(course_id,sort_order,created_at);

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
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_chapter_resources_source_check check (
    (storage_path <> '' and storage_bucket is not null and external_url is null)
    or (storage_path = '' and storage_bucket is null and external_url is not null)
  )
);
create index if not exists course_chapter_resources_chapter_idx on public.course_chapter_resources(chapter_id,created_at);
create index if not exists course_chapter_resources_published_idx on public.course_chapter_resources(chapter_id,is_published);

alter table public.practice_tests add column if not exists course_chapter_id uuid references public.course_chapters(id) on delete cascade;
create index if not exists practice_tests_course_chapter_idx on public.practice_tests(course_chapter_id);
alter table public.test_attempts add column if not exists duration_seconds integer not null default 0 check (duration_seconds between 0 and 86400);

alter table public.course_chapters enable row level security;
alter table public.course_chapter_resources enable row level security;
grant select,insert,update,delete on public.course_chapters to authenticated;
grant select,insert,update,delete on public.course_chapter_resources to authenticated;

drop policy if exists "Users read chapters of visible courses" on public.course_chapters;
create policy "Users read chapters of visible courses" on public.course_chapters for select to authenticated
using (exists(select 1 from public.courses c where c.id=course_chapters.course_id and (c.is_published or c.created_by=(select auth.uid()) or private.studyguru_is_admin())));
drop policy if exists "Course owners and admins create chapters" on public.course_chapters;
create policy "Course owners and admins create chapters" on public.course_chapters for insert to authenticated
with check (exists(select 1 from public.courses c where c.id=course_chapters.course_id and (c.created_by=(select auth.uid()) or private.studyguru_is_admin())));
drop policy if exists "Course owners and admins update chapters" on public.course_chapters;
create policy "Course owners and admins update chapters" on public.course_chapters for update to authenticated
using (exists(select 1 from public.courses c where c.id=course_chapters.course_id and (c.created_by=(select auth.uid()) or private.studyguru_is_admin())))
with check (exists(select 1 from public.courses c where c.id=course_chapters.course_id and (c.created_by=(select auth.uid()) or private.studyguru_is_admin())));
drop policy if exists "Course owners and admins delete chapters" on public.course_chapters;
create policy "Course owners and admins delete chapters" on public.course_chapters for delete to authenticated
using (exists(select 1 from public.courses c where c.id=course_chapters.course_id and (c.created_by=(select auth.uid()) or private.studyguru_is_admin())));

drop policy if exists "Users read resources of visible courses" on public.course_chapter_resources;
create policy "Users read resources of visible courses" on public.course_chapter_resources for select to authenticated
using (exists(select 1 from public.course_chapters ch join public.courses c on c.id=ch.course_id where ch.id=course_chapter_resources.chapter_id and ((course_chapter_resources.is_published and ch.is_published and c.is_published) or c.created_by=(select auth.uid()) or private.studyguru_is_admin())));
drop policy if exists "Course owners and admins add resources" on public.course_chapter_resources;
create policy "Course owners and admins add resources" on public.course_chapter_resources for insert to authenticated
with check (created_by=(select auth.uid()) and exists(select 1 from public.course_chapters ch join public.courses c on c.id=ch.course_id where ch.id=course_chapter_resources.chapter_id and (c.created_by=(select auth.uid()) or private.studyguru_is_admin())));
drop policy if exists "Course owners and admins update resources" on public.course_chapter_resources;
create policy "Course owners and admins update resources" on public.course_chapter_resources for update to authenticated
using (exists(select 1 from public.course_chapters ch join public.courses c on c.id=ch.course_id where ch.id=course_chapter_resources.chapter_id and (c.created_by=(select auth.uid()) or private.studyguru_is_admin())))
with check (created_by=(select auth.uid()) and exists(select 1 from public.course_chapters ch join public.courses c on c.id=ch.course_id where ch.id=course_chapter_resources.chapter_id and (c.created_by=(select auth.uid()) or private.studyguru_is_admin())));
drop policy if exists "Course owners and admins delete resources" on public.course_chapter_resources;
create policy "Course owners and admins delete resources" on public.course_chapter_resources for delete to authenticated
using (exists(select 1 from public.course_chapters ch join public.courses c on c.id=ch.course_id where ch.id=course_chapter_resources.chapter_id and (c.created_by=(select auth.uid()) or private.studyguru_is_admin())));

drop policy if exists "Teachers create tests" on public.practice_tests;
create policy "Teachers create tests" on public.practice_tests for insert to authenticated
with check (created_by=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('teacher','admin')) and (course_chapter_id is null or exists(select 1 from public.course_chapters ch join public.courses c on c.id=ch.course_id where ch.id=practice_tests.course_chapter_id and (c.created_by=(select auth.uid()) or private.studyguru_is_admin()))));
drop policy if exists "Teachers update own tests and admins manage tests" on public.practice_tests;
create policy "Teachers update own tests and admins manage tests" on public.practice_tests for update to authenticated
using (((created_by=(select auth.uid())) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='teacher')) or private.studyguru_is_admin())
with check ((((created_by=(select auth.uid())) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='teacher')) or private.studyguru_is_admin()) and (course_chapter_id is null or exists(select 1 from public.course_chapters ch join public.courses c on c.id=ch.course_id where ch.id=practice_tests.course_chapter_id and (c.created_by=(select auth.uid()) or private.studyguru_is_admin()))));
drop policy if exists "Users read published tests or own tests" on public.practice_tests;
create policy "Users read published tests or own tests" on public.practice_tests for select to authenticated
using ((is_published and (course_chapter_id is null or exists(select 1 from public.course_chapters ch join public.courses c on c.id=ch.course_id where ch.id=practice_tests.course_chapter_id and ch.is_published and c.is_published))) or created_by=(select auth.uid()) or private.studyguru_is_admin());
drop policy if exists "Students read questions for visible tests" on public.test_questions;
create policy "Students read questions for visible tests" on public.test_questions for select to authenticated
using (exists(select 1 from public.practice_tests t where t.id=test_questions.test_id and ((t.is_published and (t.course_chapter_id is null or exists(select 1 from public.course_chapters ch join public.courses c on c.id=ch.course_id where ch.id=t.course_chapter_id and ch.is_published and c.is_published))) or t.created_by=(select auth.uid()) or private.studyguru_is_admin()));

drop policy if exists "Students create own attempts" on public.test_attempts;
revoke insert,update,delete on public.test_attempts from authenticated;

drop policy if exists "Course teachers upload own files" on storage.objects;
create policy "Course teachers upload own files" on storage.objects for insert to authenticated with check (bucket_id in ('study-pdfs','study-videos') and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='teacher'));
drop policy if exists "Course teachers read own files" on storage.objects;
create policy "Course teachers read own files" on storage.objects for select to authenticated using (bucket_id in ('study-pdfs','study-videos') and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='teacher'));
drop policy if exists "Course students read published files" on storage.objects;
create policy "Course students read published files" on storage.objects for select to authenticated using (bucket_id in ('study-pdfs','study-videos') and exists(select 1 from public.course_chapter_resources r join public.course_chapters ch on ch.id=r.chapter_id join public.courses c on c.id=ch.course_id where r.storage_bucket=objects.bucket_id and r.storage_path=objects.name and r.is_published and ch.is_published and c.is_published));
drop policy if exists "Course teachers update own files" on storage.objects;
create policy "Course teachers update own files" on storage.objects for update to authenticated using (bucket_id in ('study-pdfs','study-videos') and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='teacher')) with check (bucket_id in ('study-pdfs','study-videos') and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='teacher'));
drop policy if exists "Course teachers delete own files" on storage.objects;
create policy "Course teachers delete own files" on storage.objects for delete to authenticated using (bucket_id in ('study-pdfs','study-videos') and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='teacher'));

update storage.buckets set file_size_limit=52428800,allowed_mime_types=array['application/pdf']::text[] where id='study-pdfs';
update storage.buckets set file_size_limit=52428800,allowed_mime_types=array['video/mp4','video/webm']::text[] where id='study-videos';

drop function if exists public.submit_studyguru_test(uuid,jsonb);
create function public.submit_studyguru_test(p_test_id uuid,p_answers jsonb,p_duration_seconds integer default 0)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  v_user uuid := auth.uid();
  v_answers jsonb := coalesce(p_answers,'{}'::jsonb);
  v_total integer;
  v_score integer;
  v_attempt_id uuid;
  v_duration integer := greatest(0,least(coalesce(p_duration_seconds,0),86400));
  v_attempted integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(v_answers) <> 'object' then raise exception 'Answers must be a JSON object'; end if;
  if p_duration_seconds is not null and (p_duration_seconds<0 or p_duration_seconds>86400) then raise exception 'Invalid test duration'; end if;
  if not exists(select 1 from public.practice_tests t where t.id=p_test_id and t.is_published and (t.course_chapter_id is null or exists(select 1 from public.course_chapters ch join public.courses c on c.id=ch.course_id where ch.id=t.course_chapter_id and ch.is_published and c.is_published))) then raise exception 'Test is not available'; end if;
  select count(*) into v_total from public.test_questions q where q.test_id=p_test_id;
  if v_total=0 then raise exception 'Test has no questions'; end if;
  if exists(select 1 from jsonb_object_keys(v_answers) as a(question_id) where not exists(select 1 from public.test_questions q where q.test_id=p_test_id and q.id::text=a.question_id)) then raise exception 'Answer contains an invalid question'; end if;
  if exists(select 1 from public.test_questions q left join public.test_answer_keys k on k.question_id=q.id where q.test_id=p_test_id and k.question_id is null) then raise exception 'Test configuration is incomplete'; end if;
  if exists(select 1 from jsonb_each_text(v_answers) as a(question_id,answer_value) where answer_value !~ '^[0-5]$') then raise exception 'Answer option is invalid'; end if;
  if exists(select 1 from jsonb_each_text(v_answers) as a(question_id,answer_value) join public.test_questions q on q.id::text=a.question_id and q.test_id=p_test_id where answer_value::integer>=jsonb_array_length(q.options)) then raise exception 'Answer option is out of range'; end if;
  select count(*) into v_score from public.test_questions q join public.test_answer_keys k on k.question_id=q.id where q.test_id=p_test_id and v_answers ? q.id::text and (v_answers->>q.id::text)::integer=k.correct_option;
  select count(*) into v_attempted from jsonb_object_keys(v_answers);
  insert into public.test_attempts(test_id,user_id,score,total_questions,answers,duration_seconds) values(p_test_id,v_user,v_score,v_total,v_answers,v_duration) returning id into v_attempt_id;
  return jsonb_build_object('attempt_id',v_attempt_id,'score',v_score,'total',v_total,'attempted',v_attempted,'duration_seconds',v_duration);
end;
$function$;
revoke all on function public.submit_studyguru_test(uuid,jsonb,integer) from public;
revoke all on function public.submit_studyguru_test(uuid,jsonb,integer) from anon;
grant execute on function public.submit_studyguru_test(uuid,jsonb,integer) to authenticated;
notify pgrst,'reload schema';
