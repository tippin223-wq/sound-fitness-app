-- REVIEW PACKAGE: Sound Fitness planning activation
-- Target: phacfkbgqrnfbjdbaxzq / main PRODUCTION
-- Prepared 2026-10-14 04:51 UTC; NOT APPLIED
-- Only the six listed app migrations. Excludes TrainerHub and website migrations.
-- Recheck source hashes and target metadata before execution.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
do $activation_guard$
begin
  if to_regclass('public.planning_documents') is not null then raise exception 'Planning table already exists: review activation state'; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and ((table_name='workout_logs' and column_name in ('session_key','plan_id','plan_day_id','assignment_id','template_client_key')) or (table_name='workout_set_logs' and column_name in ('weight_unit','semantic_metadata')) or (table_name='workout_template_exercises' and column_name='semantic_metadata') or (table_name='workout_templates' and column_name in ('client_key','revision','last_mutation_key')) or (table_name='member_messages' and column_name='app_request_id'))) then raise exception 'Planning columns already exist: review partial activation'; end if;
end
$activation_guard$;

-- SOURCE 20261012090000_planning_documents.sql
-- SHA256 3cdc5d392452c90dbb748dc9217f39355804f5bd6254817f805bbf9a1c4c695c
create table public.planning_documents (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.planning_documents enable row level security;
-- Supabase defaults include broad direct grants; RLS does not govern TRUNCATE.
revoke all on table public.planning_documents from public, anon, authenticated;
grant select, insert, update on table public.planning_documents to authenticated;
create policy planning_read_own on public.planning_documents for select to authenticated using (profile_id = auth.uid());
create policy planning_insert_own on public.planning_documents for insert to authenticated with check (profile_id = auth.uid());
create policy planning_update_own on public.planning_documents for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create or replace function public.save_planning_document(expected_revision bigint, document_payload jsonb)
returns bigint language plpgsql security invoker set search_path = public as $$
declare next_revision bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if expected_revision = 0 then
    insert into public.planning_documents(profile_id, payload) values (auth.uid(), document_payload)
    on conflict do nothing returning revision into next_revision;
  else
    update public.planning_documents set payload = document_payload, revision = revision + 1, updated_at = now()
    where profile_id = auth.uid() and revision = expected_revision returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'Planning data changed on another device' using errcode = '40001'; end if;
  return next_revision;
end $$;
revoke all on function public.save_planning_document(bigint, jsonb) from public, anon;
grant execute on function public.save_planning_document(bigint, jsonb) to authenticated;


-- SOURCE 20261012091000_planning_workout_completion.sql
-- SHA256 d2b02583ec42669108c1a690f47dec8e420b6e58d55ea6d566d6c11de775bcdb
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


-- SOURCE 20261012092000_member_app_messages.sql
-- SHA256 11afcafb309bb00f8a745345a9ada8cbff12468ddc675ac6ba0d3f4da7276406
-- The website continues reading the same member_messages rows. Members cannot impersonate coaches.
alter table public.member_messages add column app_request_id uuid;
create unique index member_messages_app_request_unique on public.member_messages(member_id, app_request_id) where app_request_id is not null;

create or replace function public.send_app_member_message(message_body text, request_id uuid, expected_member_id uuid default null)
returns setof public.member_messages language plpgsql security definer set search_path = public as $$
declare member uuid := auth.uid(); existing public.member_messages;
begin
  if expected_member_id is not null and expected_member_id is distinct from member then raise exception 'Message account changed' using errcode = '42501'; end if;
  if member is null or not exists (select 1 from public.profiles where id = member and role = 'member') then raise exception 'Member authentication required'; end if;
  if request_id is null or length(btrim(message_body)) not between 1 and 2000 then raise exception 'Message must contain 1 to 2000 characters'; end if;
  perform pg_advisory_xact_lock(hashtextextended(member::text, 0));
  select * into existing from public.member_messages where member_id = member and app_request_id = request_id;
  if found then
    if existing.body is distinct from btrim(message_body) then raise exception 'Message request already has a different saved body' using errcode = '23505'; end if;
    return next existing; return;
  end if;
  if (select count(*) from public.member_messages where member_id = member and sent_by = 'member' and created_at > now() - interval '1 minute') >= 5 then raise exception 'Please wait a minute before sending another message'; end if;
  return query insert into public.member_messages(member_id, sent_by, body, app_request_id) values (member, 'member', btrim(message_body), request_id) returning *;
end $$;
revoke all on function public.send_app_member_message(text, uuid, uuid) from public, anon;
grant execute on function public.send_app_member_message(text, uuid, uuid) to authenticated;


-- SOURCE 20261012093000_atomic_workout_templates.sql
-- SHA256 8982af24d59fa4440f8bae1541842ad12b5013446a8ac3c8fdfbaef25370b0de
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


-- SOURCE 20261013130000_workout_exercise_semantics.sql
-- SHA256 e4cb9670bfa5ec3fd291e474ab733478e61d439c7579ec68770fa8c3c059e10b
-- Optional recorded variation identity travels with each ordered exercise occurrence.
-- Existing rows and older clients retain {} (unknown); no catalog inference/backfill.
create or replace function public.valid_workout_semantic_metadata(value jsonb)
returns boolean language plpgsql immutable security invoker set search_path = public as $$
declare field text;
begin
  if value is null or jsonb_typeof(value) is distinct from 'object' then return false; end if;
  if exists (select 1 from jsonb_object_keys(value) as item(key) where item.key <> all(array['coreMovementPattern', 'semanticVariationId', 'semanticVariationName', 'generatedTitle', 'selectedModifierIds'])) then return false; end if;
  foreach field in array array['coreMovementPattern', 'semanticVariationId', 'semanticVariationName', 'generatedTitle'] loop
    if value ? field and jsonb_typeof(value->field) not in ('string', 'null') then return false; end if;
  end loop;
  if value ? 'selectedModifierIds' and value->'selectedModifierIds' <> 'null'::jsonb then
    if jsonb_typeof(value->'selectedModifierIds') is distinct from 'array' then return false; end if;
    if exists (select 1 from jsonb_array_elements(value->'selectedModifierIds') as item(entry) where jsonb_typeof(item.entry) is distinct from 'string') then return false; end if;
  end if;
  return true;
end; $$;
revoke all on function public.valid_workout_semantic_metadata(jsonb) from public, anon;
grant execute on function public.valid_workout_semantic_metadata(jsonb) to authenticated;

alter table public.workout_template_exercises add column if not exists semantic_metadata jsonb not null default '{}'::jsonb
  constraint workout_template_exercises_semantics_valid check (public.valid_workout_semantic_metadata(semantic_metadata));
alter table public.workout_set_logs add column if not exists semantic_metadata jsonb not null default '{}'::jsonb
  constraint workout_set_logs_semantics_valid check (public.valid_workout_semantic_metadata(semantic_metadata));

-- Clients must verify capability before older RPCs can silently discard metadata.
create or replace function public.planning_workout_semantics_version()
returns integer language sql stable security invoker set search_path = public as $$ select 1 $$;
revoke all on function public.planning_workout_semantics_version() from public, anon;
grant execute on function public.planning_workout_semantics_version() to authenticated;

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
  if exists (select 1 from jsonb_array_elements(exercise_payload) as item(value)
    where not public.valid_workout_semantic_metadata(coalesce(item.value->'semantic_metadata', '{}'::jsonb))) then
    raise exception 'Exercise variation metadata needs review' using errcode = '22023';
  end if;
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
  insert into public.workout_template_exercises(workout_template_id, exercise_id, exercise_name, body, pattern, equipment, order_index, target_sets, target_reps, target_rest_seconds, tempo, notes, semantic_metadata)
    select saved.id, x.exercise_id, x.exercise_name, x.body, x.pattern, x.equipment, (item.ordinality - 1)::integer, x.target_sets, x.target_reps, x.target_rest_seconds, x.tempo, x.notes, coalesce(x.semantic_metadata, '{}'::jsonb)
    from jsonb_array_elements(exercise_payload) with ordinality as item(value, ordinality)
    cross join lateral jsonb_to_record(item.value) as x(exercise_id text, exercise_name text, body text, pattern text, equipment text, target_sets integer, target_reps text, target_rest_seconds integer, tempo text, notes text, semantic_metadata jsonb);
  return jsonb_build_object('template', to_jsonb(saved), 'exercises', coalesce((select jsonb_agg(to_jsonb(e) order by e.order_index) from public.workout_template_exercises e where e.workout_template_id = saved.id), '[]'::jsonb));
end; $$;
revoke all on function public.save_workout_template_atomic(text, jsonb, jsonb) from public, anon;
grant execute on function public.save_workout_template_atomic(text, jsonb, jsonb) to authenticated;

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
    if payload_kind = 'exercise' and not public.valid_workout_semantic_metadata(coalesce(item->'semantic_metadata', '{}'::jsonb)) then
      raise exception 'Exercise variation metadata needs review' using errcode = '22023';
    end if;
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
      select jsonb_build_array(exercise_id, exercise_name, body, pattern, equipment, weight, weight_unit, reps, sets, performed_at, order_index, coalesce(semantic_metadata, '{}'::jsonb)) as payload
      from public.workout_set_logs where workout_log_id = log_id and profile_id = auth.uid()
    ) saved;
    select jsonb_agg(payload order by payload) into requested_sets from (
      select jsonb_build_array(exercise_id, exercise_name, body, pattern, equipment, weight, nullif(btrim(weight_unit, E' \t\n\r'), ''), reps, sets, performed_at, order_index, coalesce(semantic_metadata, '{}'::jsonb)) as payload
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
    insert into public.workout_set_logs(workout_log_id, profile_id, exercise_id, exercise_name, body, pattern, equipment, weight, weight_unit, reps, sets, performed_at, source, order_index, semantic_metadata)
    values (log_id, auth.uid(), item->>'exercise_id', item->>'exercise_name', item->>'body', item->>'pattern', item->>'equipment', recorded_weight, nullif(btrim(item->>'weight_unit', E' \t\n\r'), ''), (item->>'reps')::integer, (item->>'sets')::integer, performed_time, 'workout-session', recorded_order, coalesce(item->'semantic_metadata', '{}'::jsonb));
  end loop;
  return log_id;
end $$;
revoke all on function public.save_completed_planning_workout(text, jsonb, jsonb) from public, anon;
grant execute on function public.save_completed_planning_workout(text, jsonb, jsonb) to authenticated;


-- SOURCE 20261013133000_workout_template_identity.sql
-- SHA256 c77c7c4087b1a9013aa295073c8205914d8fb46f21978d91c6b6fcdda483ea79
-- Preserve the original template key independently of an optional relational UUID.
-- Null legacy keys remain unknown; do not infer or backfill member history.
alter table public.workout_logs add column if not exists template_client_key text
  constraint workout_logs_template_client_key_valid check (template_client_key is null or length(template_client_key) between 1 and 200 and nullif(btrim(template_client_key), '') is not null);
create or replace function public.planning_workout_template_identity_version()
returns integer language sql stable security invoker set search_path = public as $$ select 1 $$;
revoke all on function public.planning_workout_template_identity_version() from public, anon;
grant execute on function public.planning_workout_template_identity_version() to authenticated;

create or replace function public.save_completed_planning_workout(session_key text, log_payload jsonb, set_payloads jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare log_id uuid; template_id uuid; client_template_id uuid; client_template_count integer; requested_template_key text; item jsonb; existing_sets jsonb; requested_sets jsonb;
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
  foreach metadata_key in array array['plan_id', 'plan_day_id', 'assignment_id', 'workout_template_id', 'template_client_key'] loop
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
    if payload_kind = 'exercise' and not public.valid_workout_semantic_metadata(coalesce(item->'semantic_metadata', '{}'::jsonb)) then
      raise exception 'Exercise variation metadata needs review' using errcode = '22023';
    end if;
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
  requested_template_key := log_payload->>'template_client_key';
  if requested_template_key is not null then
    if length(requested_template_key) > 200 or nullif(btrim(requested_template_key), '') is null then
      raise exception 'Invalid recorded workout template identity' using errcode = '22023';
    end if;
    select count(*) into client_template_count from public.workout_templates t where t.owner_profile_id = auth.uid()
      and coalesce(t.client_key, t.id::text) = requested_template_key;
    if client_template_count > 1 then
      raise exception 'Recorded workout template identity is ambiguous. Original records are preserved.' using errcode = '22023';
    end if;
    select t.id into client_template_id from public.workout_templates t where t.owner_profile_id = auth.uid()
      and coalesce(t.client_key, t.id::text) = requested_template_key;
    if template_id is not null and (client_template_id is null or client_template_id <> template_id) then
      raise exception 'Recorded workout template links disagree' using errcode = '22023';
    end if;
    template_id := coalesce(client_template_id, template_id);
  end if;
  insert into public.workout_logs(profile_id, session_key, workout_template_id, title, status, started_at, completed_at, source, plan_id, plan_day_id, assignment_id, template_client_key)
  values (auth.uid(), save_completed_planning_workout.session_key, template_id, log_payload->>'title', 'completed', started_time, completed_time, 'workout-session', log_payload->>'plan_id', log_payload->>'plan_day_id', nullif(log_payload->>'assignment_id', ''), requested_template_key)
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
    if exists (select 1 from public.workout_logs saved where saved.id = log_id and (
      saved.template_client_key is not null and saved.template_client_key is distinct from requested_template_key
      or saved.template_client_key is null and requested_template_key is not null and not exists (
        select 1 from public.workout_templates t where t.id = saved.workout_template_id and t.owner_profile_id = auth.uid()
          and coalesce(t.client_key, t.id::text) = requested_template_key
      )
    )) then
      raise exception 'This session already has different saved template identity. Original records are preserved.' using errcode = '23505';
    end if;
    select jsonb_agg(payload order by payload) into existing_sets from (
      select jsonb_build_array(exercise_id, exercise_name, body, pattern, equipment, weight, weight_unit, reps, sets, performed_at, order_index, coalesce(semantic_metadata, '{}'::jsonb)) as payload
      from public.workout_set_logs where workout_log_id = log_id and profile_id = auth.uid()
    ) saved;
    select jsonb_agg(payload order by payload) into requested_sets from (
      select jsonb_build_array(exercise_id, exercise_name, body, pattern, equipment, weight, nullif(btrim(weight_unit, E' \t\n\r'), ''), reps, sets, performed_at, order_index, coalesce(semantic_metadata, '{}'::jsonb)) as payload
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
    insert into public.workout_set_logs(workout_log_id, profile_id, exercise_id, exercise_name, body, pattern, equipment, weight, weight_unit, reps, sets, performed_at, source, order_index, semantic_metadata)
    values (log_id, auth.uid(), item->>'exercise_id', item->>'exercise_name', item->>'body', item->>'pattern', item->>'equipment', recorded_weight, nullif(btrim(item->>'weight_unit', E' \t\n\r'), ''), (item->>'reps')::integer, (item->>'sets')::integer, performed_time, 'workout-session', recorded_order, coalesce(item->'semantic_metadata', '{}'::jsonb));
  end loop;
  return log_id;
end $$;
revoke all on function public.save_completed_planning_workout(text, jsonb, jsonb) from public, anon;
grant execute on function public.save_completed_planning_workout(text, jsonb, jsonb) to authenticated;

commit;
