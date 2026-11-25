create or replace function public.submit_studyguru_test(
  p_test_id uuid,
  p_answers jsonb,
  p_duration_seconds integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_answers jsonb := coalesce(p_answers, '{}'::jsonb);
  v_total integer;
  v_correct integer;
  v_incorrect integer;
  v_skipped integer;
  v_attempted integer;
  v_marks integer;
  v_negative integer;
  v_score integer;
  v_total_marks integer;
  v_attempt_id uuid;
  v_duration integer := greatest(0, least(coalesce(p_duration_seconds, 0), 86400));
  v_accuracy numeric;
  v_completion numeric;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(v_answers) <> 'object' then raise exception 'Answers must be a JSON object'; end if;
  if p_duration_seconds is not null and (p_duration_seconds < 0 or p_duration_seconds > 86400) then
    raise exception 'Invalid test duration';
  end if;

  select coalesce(t.marks_per_question, 4), coalesce(t.negative_marks, 1)
    into v_marks, v_negative
  from public.practice_tests t
  where t.id = p_test_id
    and (
      t.created_by = v_user
      or private.studyguru_is_admin()
      or (
        t.is_published = true
        and (
          (t.course_id is null and t.course_subject_id is null and t.course_chapter_id is null)
          or (
            t.course_chapter_id is not null
            and exists (
              select 1 from public.course_chapters ch
              join public.courses c on c.id = ch.course_id
              where ch.id = t.course_chapter_id and ch.is_published = true
                and c.is_published = true and (t.course_id is null or t.course_id = c.id)
            )
          )
          or (
            t.course_subject_id is not null
            and exists (
              select 1 from public.course_subjects cs
              join public.courses c on c.id = cs.course_id
              where cs.id = t.course_subject_id and c.is_published = true
                and (t.course_id is null or t.course_id = c.id)
            )
          )
          or (
            t.course_id is not null and t.course_subject_id is null and t.course_chapter_id is null
            and exists (select 1 from public.courses c where c.id = t.course_id and c.is_published = true)
          )
        )
      )
    );

  if not found then raise exception 'Test is not available'; end if;

  select count(*) into v_total from public.test_questions q where q.test_id = p_test_id;
  if v_total = 0 then raise exception 'Test has no questions'; end if;
  if v_total > 2000 then raise exception 'A test cannot contain more than 2000 questions'; end if;

  if exists (
    select 1 from jsonb_object_keys(v_answers) as a(question_id)
    where not exists (
      select 1 from public.test_questions q
      where q.test_id = p_test_id and q.id::text = a.question_id
    )
  ) then raise exception 'Answer contains an invalid question'; end if;

  if exists (
    select 1 from public.test_questions q
    left join public.test_answer_keys k on k.question_id = q.id
    where q.test_id = p_test_id and k.question_id is null
  ) then raise exception 'Test configuration is incomplete'; end if;

  if exists (
    select 1 from jsonb_each_text(v_answers) as a(question_id, answer_value)
    where answer_value !~ '^[0-5]$'
  ) then raise exception 'Answer option is invalid'; end if;

  if exists (
    select 1 from jsonb_each_text(v_answers) as a(question_id, answer_value)
    join public.test_questions q on q.id::text = a.question_id and q.test_id = p_test_id
    where answer_value::integer >= jsonb_array_length(q.options)
  ) then raise exception 'Answer option is out of range'; end if;

  select count(*) into v_correct
  from public.test_questions q
  join public.test_answer_keys k on k.question_id = q.id
  where q.test_id = p_test_id and v_answers ? q.id::text
    and (v_answers ->> q.id::text)::integer = k.correct_option;

  select count(*) into v_attempted from jsonb_object_keys(v_answers);
  v_incorrect := v_attempted - v_correct;
  v_skipped := v_total - v_attempted;
  v_total_marks := v_total * v_marks;
  v_score := greatest(0, (v_correct * v_marks) - (v_incorrect * v_negative));
  v_accuracy := case when v_attempted = 0 then 0
    else round((v_correct::numeric / v_attempted::numeric) * 100, 1) end;
  v_completion := round((v_attempted::numeric / v_total::numeric) * 100, 1);

  insert into public.test_attempts (
    test_id, user_id, score, total_questions, answers, duration_seconds,
    correct_count, incorrect_count, skipped_count, attempted_count, total_marks
  ) values (
    p_test_id, v_user, v_score, v_total, v_answers, v_duration,
    v_correct, v_incorrect, v_skipped, v_attempted, v_total_marks
  ) returning id into v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id, 'score', v_score, 'obtained_marks', v_score,
    'total', v_total, 'total_questions', v_total, 'total_marks', v_total_marks,
    'correct', v_correct, 'correct_count', v_correct,
    'incorrect', v_incorrect, 'incorrect_count', v_incorrect,
    'skipped', v_skipped, 'skipped_count', v_skipped,
    'attempted', v_attempted, 'attempted_count', v_attempted,
    'accuracy', v_accuracy, 'completion', v_completion,
    'marks_per_question', v_marks, 'negative_marks', v_negative,
    'duration_seconds', v_duration
  );
end;
$function$;

revoke all on function public.submit_studyguru_test(uuid, jsonb, integer) from public, anon;
grant execute on function public.submit_studyguru_test(uuid, jsonb, integer) to authenticated, service_role;
