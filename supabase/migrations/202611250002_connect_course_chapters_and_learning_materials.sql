alter table public.learning_materials
  add column if not exists course_chapter_id uuid references public.course_chapters(id) on delete cascade;

alter table public.learning_materials
  alter column chapter_id drop not null;

create index if not exists learning_materials_course_chapter_idx
  on public.learning_materials(course_chapter_id);

alter table public.learning_materials
  drop constraint if exists learning_materials_chapter_assignment_check;

alter table public.learning_materials
  add constraint learning_materials_chapter_assignment_check
  check (chapter_id is not null or course_chapter_id is not null);

-- Link the existing class/subject/chapter catalogue to the Course → Subject → Chapter structure.
insert into public.course_chapters
  (course_id, course_subject_id, title, description, sort_order, is_published)
select c.id, cs.id, ch.name, null, ch.sort_order, true
from public.courses c
join public.course_subjects cs on cs.course_id = c.id
join public.classes cl on lower(trim(cl.name)) = lower(trim(c.class_name))
join public.subjects s on s.class_id = cl.id
  and lower(trim(s.name)) = lower(trim(cs.name))
join public.chapters ch on ch.subject_id = s.id and ch.is_active = true
where not exists (
  select 1 from public.course_chapters existing
  where existing.course_subject_id = cs.id
    and lower(trim(existing.title)) = lower(trim(ch.name))
);

-- Retain a direct link for any existing material rows that match the old catalogue.
update public.learning_materials m
set course_chapter_id = cch.id
from public.chapters old_ch
join public.subjects old_s on old_s.id = old_ch.subject_id
join public.classes old_cl on old_cl.id = old_s.class_id
join public.courses c on lower(trim(c.class_name)) = lower(trim(old_cl.name))
join public.course_subjects cs on cs.course_id = c.id
  and lower(trim(cs.name)) = lower(trim(old_s.name))
join public.course_chapters cch on cch.course_subject_id = cs.id
  and lower(trim(cch.title)) = lower(trim(old_ch.name))
where m.chapter_id = old_ch.id
  and m.course_chapter_id is null;

drop policy if exists "Students read published materials and admins read all" on public.learning_materials;
create policy "Students read published materials and admins read all"
on public.learning_materials
for select
to authenticated
using (
  (is_published = true and (
    course_chapter_id is null
    or exists (
      select 1
      from public.course_chapters ch
      join public.courses c on c.id = ch.course_id
      where ch.id = learning_materials.course_chapter_id
        and ch.is_published = true
        and c.is_published = true
    )
  ))
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);
