alter table public.workout_logs add column session_key text;
alter table public.workout_logs add column plan_id text;
alter table public.workout_logs add column plan_day_id text;
alter table public.workout_logs add column assignment_id text;
alter table public.workout_logs add constraint workout_logs_profile_session_key_unique unique (profile_id, session_key);
create unique index workout_logs_profile_assignment_unique on public.workout_logs(profile_id, assignment_id) where assignment_id is not null;
-- Nullable preserves the unknown unit of existing rows; never backfill from Profile preferences.
alter table public.workout_set_logs add column weight_unit text
  constraint workout_set_logs_weight_unit_check check (weight_unit is null or weight_unit in ('lb', 'kg'));

-- Clients must verify support before sending units to older RPCs that discard extra JSON fields.
create or replace function public.planning_workout_load_unit_version()
returns integer language sql stable security invoker set search_path = public as $$ select 1 $$;
revoke all on function public.planning_workout_load_unit_version() from public, anon;
grant execute on function public.planning_workout_load_unit_version() to authenticated;

-- One transaction saves both the workout and all sets. Only the original session can replay its log.
create or replace function public.save_completed_planning_workout(session_key text, log_payload jsonb, set_payloads jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare log_id uuid; template_id uuid; item jsonb; existing_sets jsonb; requested_sets jsonb;
  completed_time timestamptz; started_time timestamptz; performed_time timestamptz;
  recorded_weight numeric;
  metadata_key text; payload_kind text; recorded_order integer; seen_orders integer[] := array[]::integer[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if log_payload->>'profile_id' is not null and log_payload->>'profile_id' <> auth.uid()::text then raise exception 'Account changed before workout save' using errcode = '42501'; end if;
  if jsonb_typeof(log_payload) is distinct from 'object' or jsonb_typeof(set_payloads) is distinct from 'array' then
    raise exception 'Workout details and an exercise array are required' using errcode = '22023';
  end if;
  if nullif(btrim(session_key), '') is null or jsonb_array_length(set_payloads) = 0 then raise exception 'Session and exercise entries required' using errcode = '22023'; end if;
  foreach metadata_key in array array['plan_id', 'plan_day_id', 'assignment_id', 'workout_template_id'] loop
    if log_payload ? metadata_key and jsonb_typeof(log_payload->metadata_key) not in ('string', 'null') then
      raise exception 'Workout links must be text or unreported' using errcode = '22023';
    end if;
  end loop;
  if jsonb_typeof(log_payload->'title') is distinct from 'string'
    or nullif(btrim(log_payload->>'title', E' \t\n\r'), '') is null then
    raise exception 'A recorded text workout title is required' using errcode = '22023';
  end if;
  if jsonb_typeof(log_payload->'completed_at') is distinct from 'string' then
    raise exception 'A recorded workout completion date is required' using errcode = '22007';
  end if;
  completed_time := (log_payload->>'completed_at')::timestamptz;
  started_time := (log_payload->>'started_at')::timestamptz;
  if completed_time is null or not isfinite(completed_time) or
    (started_time is not null and (not isfinite(started_time) or started_time > completed_time)) then
    raise exception 'Workout dates must be finite and start on or before completion' using errcode = '22007';
  end if;
  -- Only the canonical per-exercise column can preserve units. Check before both
  -- insert and replay; JSON projection would otherwise discard extra fields.
  for item, payload_kind in select log_payload, 'workout' union all select value, 'exercise' from jsonb_array_elements(set_payloads) loop
    foreach metadata_key in array array[
      'weightUnit', 'weight_unit', 'loadUnit', 'load_unit', 'unit',
      'weightPounds', 'weightLb', 'weightLbs', 'weightKg', 'weightKilograms',
      'loadPounds', 'loadLb', 'loadLbs', 'loadKg', 'loadKilograms'
    ] loop
      if payload_kind = 'exercise' and metadata_key = 'weight_unit'
        and jsonb_typeof(item->metadata_key) = 'string' and item->>metadata_key in ('lb', 'kg') then
        continue;
      end if;
      if item ? metadata_key and item->metadata_key <> 'null'::jsonb and not (
        jsonb_typeof(item->metadata_key) = 'string' and btrim(item->>metadata_key, E' \t\n\r') = ''
      ) then
        raise exception 'Workout load-unit metadata cannot be preserved by this format; retain the original record for review'
          using errcode = '22023';
      end if;
    end loop;
  end loop;
  -- A local template may not have reached its relational table yet. Never link another member's template.
  select id into template_id from public.workout_templates where id = (log_payload->>'workout_template_id')::uuid and owner_profile_id = auth.uid();
  insert into public.workout_logs(profile_id, session_key, workout_template_id, title, status, started_at, completed_at, source, plan_id, plan_day_id, assignment_id)
  values (auth.uid(), save_completed_planning_workout.session_key, template_id, log_payload->>'title', 'completed', started_time, completed_time, 'workout-session', log_payload->>'plan_id', log_payload->>'plan_day_id', nullif(log_payload->>'assignment_id', ''))
  on conflict do nothing returning id into log_id;
  if log_id is null then
    select id into log_id from public.workout_logs where profile_id = auth.uid() and workout_logs.session_key = save_completed_planning_workout.session_key;
    if log_id is null then
      raise exception 'This plan assignment was already completed by another session. Your device record is preserved; refresh History before reconciling.' using errcode = '23505';
    end if;
    -- An idempotency key confirms only the same completion, never changed device values.
    if exists (
      select 1 from public.workout_logs where id = log_id and
        row(title, status, started_at, completed_at, plan_id, plan_day_id, assignment_id) is distinct from
        row(log_payload->>'title', 'completed'::text, (log_payload->>'started_at')::timestamptz,
          (log_payload->>'completed_at')::timestamptz, log_payload->>'plan_id', log_payload->>'plan_day_id', nullif(log_payload->>'assignment_id', ''))
    ) then
      raise exception 'This session already has different saved workout values. Both records are preserved; refresh History before reconciling.' using errcode = '23505';
    end if;
    select jsonb_agg(payload order by payload) into existing_sets from (
      select jsonb_build_array(exercise_id, exercise_name, body, pattern, equipment, weight, weight_unit, reps, sets, performed_at, order_index) as payload
      from public.workout_set_logs where workout_log_id = log_id and profile_id = auth.uid()
    ) saved;
    select jsonb_agg(payload order by payload) into requested_sets from (
      select jsonb_build_array(exercise_id, exercise_name, body, pattern, equipment, weight, nullif(btrim(weight_unit, E' \t\n\r'), ''), reps, sets, performed_at, order_index) as payload
      from jsonb_populate_recordset(null::public.workout_set_logs, set_payloads)
    ) requested;
    if existing_sets is distinct from requested_sets then
      raise exception 'This session already has different saved exercise values. Both records are preserved; refresh History before reconciling.' using errcode = '23505';
    end if;
    return log_id;
  end if;
  for item in select value from jsonb_array_elements(set_payloads) loop
    if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'exercise_name') is distinct from 'string'
      or nullif(btrim(item->>'exercise_name', E' \t\n\r'), '') is null then
      raise exception 'Each exercise needs a recorded text name' using errcode = '22023';
    end if;
    foreach metadata_key in array array['exercise_id', 'body', 'pattern', 'equipment'] loop
      if item ? metadata_key and jsonb_typeof(item->metadata_key) not in ('string', 'null') then
        raise exception 'Exercise metadata must be text or unreported' using errcode = '22023';
      end if;
    end loop;
    recorded_order := (item->>'order_index')::integer;
    if recorded_order is null or recorded_order < 0 or recorded_order = any(seen_orders) then
      raise exception 'Exercise order must use distinct nonnegative indexes' using errcode = '22023';
    end if;
    seen_orders := array_append(seen_orders, recorded_order);
    if jsonb_typeof(item->'performed_at') is distinct from 'string' then
      raise exception 'A recorded exercise date is required' using errcode = '22007';
    end if;
    performed_time := (item->>'performed_at')::timestamptz;
    if performed_time is null or not isfinite(performed_time) then
      raise exception 'Exercise dates must be finite' using errcode = '22007';
    end if;
    recorded_weight := (item->>'weight')::numeric;
    if recorded_weight::text in ('NaN', 'Infinity', '-Infinity') then
      raise exception 'Recorded exercise load must be finite or unreported' using errcode = '22003';
    end if;
    insert into public.workout_set_logs(workout_log_id, profile_id, exercise_id, exercise_name, body, pattern, equipment, weight, weight_unit, reps, sets, performed_at, source, order_index)
    values (log_id, auth.uid(), item->>'exercise_id', item->>'exercise_name', item->>'body', item->>'pattern', item->>'equipment', recorded_weight, nullif(btrim(item->>'weight_unit', E' \t\n\r'), ''), (item->>'reps')::integer, (item->>'sets')::integer, performed_time, 'workout-session', recorded_order);
  end loop;
  return log_id;
end $$;
revoke all on function public.save_completed_planning_workout(text, jsonb, jsonb) from public, anon;
grant execute on function public.save_completed_planning_workout(text, jsonb, jsonb) to authenticated;
