alter table public.workout_templates add column if not exists client_key text;
alter table public.workout_templates add column if not exists revision integer not null default 0;
alter table public.workout_templates add column if not exists last_mutation_key text;
create unique index if not exists workout_templates_owner_client_key_unique
  on public.workout_templates(owner_profile_id, client_key) where client_key is not null;

-- Parent metadata and all exercises commit together; failures preserve the old workout.
create or replace function public.save_workout_template_atomic(client_key text, template_payload jsonb, exercise_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  saved public.workout_templates;
  requested_id uuid;
  mutation_key text := template_payload->>'mutation_key';
  expected_revision integer := coalesce((template_payload->>'expected_revision')::integer, 0);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if template_payload->>'owner_profile_id' is not null and template_payload->>'owner_profile_id' <> auth.uid()::text then raise exception 'Account changed before template save' using errcode = '42501'; end if;
  if client_key is null or length(trim(client_key)) = 0 or length(client_key) > 200 then raise exception 'Invalid workout identity'; end if;
  if jsonb_typeof(exercise_payload) is distinct from 'array' or jsonb_array_length(exercise_payload) > 100 then raise exception 'Invalid workout exercises'; end if;
  if length(trim(coalesce(template_payload->>'title', ''))) = 0 then raise exception 'Enter a workout title'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':template:' || client_key, 0));
  requested_id := nullif(template_payload->>'id', '')::uuid;
  select * into saved from public.workout_templates t
    where t.owner_profile_id = auth.uid() and (t.client_key = save_workout_template_atomic.client_key or t.id = requested_id)
    for update;
  if saved.id is null then
    insert into public.workout_templates(id, owner_profile_id, title, goal, source, status, client_key)
    values(coalesce(requested_id, gen_random_uuid()), auth.uid(), trim(template_payload->>'title'), template_payload->>'goal', 'builder', 'active', client_key)
    returning * into saved;
  else
    if mutation_key is not null and saved.last_mutation_key = mutation_key then
      return jsonb_build_object('template', to_jsonb(saved), 'exercises', coalesce((select jsonb_agg(to_jsonb(e) order by e.order_index) from public.workout_template_exercises e where e.workout_template_id = saved.id), '[]'::jsonb));
    end if;
    if saved.revision <> expected_revision then raise exception 'Workout template sync conflict. Your local edit is preserved; review the newer cloud version before retrying.' using errcode = '40001'; end if;
    update public.workout_templates t set title = trim(template_payload->>'title'), goal = template_payload->>'goal', client_key = save_workout_template_atomic.client_key
      where t.id = saved.id returning * into saved;
  end if;
  update public.workout_templates t set revision = t.revision + 1, last_mutation_key = mutation_key
    where t.id = saved.id returning * into saved;
  delete from public.workout_template_exercises where workout_template_id = saved.id;
  insert into public.workout_template_exercises(workout_template_id, exercise_id, exercise_name, body, pattern, equipment, order_index, target_sets, target_reps, target_rest_seconds, tempo, notes)
    select saved.id, x.exercise_id, x.exercise_name, x.body, x.pattern, x.equipment, (item.ordinality - 1)::integer, x.target_sets, x.target_reps, x.target_rest_seconds, x.tempo, x.notes
    from jsonb_array_elements(exercise_payload) with ordinality as item(value, ordinality)
    cross join lateral jsonb_to_record(item.value) as x(exercise_id text, exercise_name text, body text, pattern text, equipment text, target_sets integer, target_reps text, target_rest_seconds integer, tempo text, notes text);
  return jsonb_build_object('template', to_jsonb(saved), 'exercises', coalesce((select jsonb_agg(to_jsonb(e) order by e.order_index) from public.workout_template_exercises e where e.workout_template_id = saved.id), '[]'::jsonb));
end; $$;
revoke all on function public.save_workout_template_atomic(text, jsonb, jsonb) from public, anon;
grant execute on function public.save_workout_template_atomic(text, jsonb, jsonb) to authenticated;
