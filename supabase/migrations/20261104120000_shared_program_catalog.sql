-- One catalog for website and app. Versions are immutable, including activities and rewards.
begin;
create table if not exists public.fitness_program_versions (
  program_id text not null,
  version integer not null check (version > 0),
  definition jsonb not null,
  created_at timestamptz not null default now(),
  primary key (program_id, version),
  check (definition->>'id' = program_id),
  check ((definition->>'version')::integer = version),
  check (definition->>'status' in ('review','published'))
);
create or replace function public.validate_fitness_program_version() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare points bigint; levels integer; activity_count integer; reward_count integer;
begin
  if tg_op = 'UPDATE' then raise exception 'Program versions are immutable; publish a new version'; end if;
  levels := (new.definition->>'totalLevels')::integer;
  if levels < 1 or levels > 1000 or (new.definition->>'pointsPerLevel')::integer <> 100 then
    raise exception 'Invalid program level budget';
  end if;
  select sum((a->>'points')::integer), count(distinct a->>'id') into points, activity_count
    from jsonb_array_elements(new.definition->'activities') a;
  if points <> levels * 100 or activity_count <> jsonb_array_length(new.definition->'activities') then
    raise exception 'Activities must have unique identities and exactly fund the level budget';
  end if;
  if exists (select 1 from jsonb_array_elements(new.definition->'activities') a
    where (a->>'points')::integer not in (25,50,100) or (a->>'week')::integer not between 1 and (new.definition->>'weeks')::integer
      or (a->>'day')::integer not between 1 and 7 or coalesce(a->'signal'->>'action','') = '') then
    raise exception 'Invalid activity or missing signal';
  end if;
  select count(distinct (r->>'level')::integer) into reward_count from jsonb_array_elements(new.definition->'rewards') r;
  if reward_count <> levels or jsonb_array_length(new.definition->'rewards') <> levels then raise exception 'One reward per level required'; end if;
  if exists (select 1 from jsonb_array_elements(new.definition->'rewards') r where
    (r->>'level')::integer not between 1 and levels or
    case when (r->>'level')::integer % 5 = 0 then r->>'kind' <> 'cosmetic' or (r->>'amount')::integer <> 1
    else r->>'kind' <> 'currency' or not (
      (r->>'asset'='coins' and (r->>'amount')::integer=50) or
      (r->>'asset'='bolts' and (r->>'amount')::integer=5) or
      (r->>'asset' in ('sapphire','topaz','ruby') and (r->>'amount')::integer=1)) end) then
    raise exception 'Invalid reward track';
  end if;
  if new.definition->>'status' = 'published' and exists (
    select 1 from jsonb_array_elements(new.definition->'rewards') r where r->>'fulfillment' <> 'ready') then
    raise exception 'Finish reward assets before publishing for enrollment';
  end if;
  return new;
end $$;
drop trigger if exists fitness_program_version_guard on public.fitness_program_versions;
create trigger fitness_program_version_guard before insert or update on public.fitness_program_versions
for each row execute function public.validate_fitness_program_version();
alter table public.fitness_program_versions enable row level security;
create policy fitness_program_catalog_read on public.fitness_program_versions for select to anon, authenticated using (true);
grant select on public.fitness_program_versions to anon, authenticated;
revoke insert, update, delete on public.fitness_program_versions from anon, authenticated;

create table if not exists public.fitness_program_enrollments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  program_id text not null,
  version integer not null,
  start_date date not null,
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_at timestamptz not null default now(),
  foreign key (program_id,version) references public.fitness_program_versions(program_id,version)
);
create unique index if not exists fitness_program_one_active on public.fitness_program_enrollments(profile_id)
where status = 'active';
alter table public.fitness_program_enrollments enable row level security;
create policy fitness_program_enrollment_read on public.fitness_program_enrollments for select to authenticated using (profile_id=auth.uid());
grant select on public.fitness_program_enrollments to authenticated;
revoke insert, update, delete on public.fitness_program_enrollments from anon, authenticated;
create table if not exists public.fitness_program_activity_credits (
  enrollment_id uuid not null references public.fitness_program_enrollments(id),
  activity_id text not null,
  evidence_kind text not null,
  evidence_id text not null,
  points integer not null check(points in (25,50,100)),
  created_at timestamptz not null default now(),
  primary key (enrollment_id,activity_id),
  unique(evidence_kind,evidence_id)
);
alter table public.fitness_program_activity_credits enable row level security;
create policy fitness_program_credits_read on public.fitness_program_activity_credits for select to authenticated using (
  exists(select 1 from public.fitness_program_enrollments e where e.id=enrollment_id and e.profile_id=auth.uid()));
grant select on public.fitness_program_activity_credits to authenticated;
revoke insert, update, delete on public.fitness_program_activity_credits from anon, authenticated;
-- Deliberately no client point-award RPC. Evidence adapters must verify the exact
-- saved workout / support record and award from the frozen activity definition.
create or replace function public.enroll_fitness_program(p_program_id text,p_version integer,p_start_date date)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_start_date is null or p_start_date < current_date or p_start_date > current_date+90 then raise exception 'Choose a start date within 90 days'; end if;
  perform 1 from public.fitness_program_versions where program_id=p_program_id and version=p_version and definition->>'status'='published';
  if not found then raise exception 'This program is not yet open for enrollment'; end if;
  insert into public.fitness_program_enrollments(profile_id,program_id,version,start_date)
  values(auth.uid(),p_program_id,p_version,p_start_date) returning id into result;
  return result;
end $$;
revoke all on function public.enroll_fitness_program(text,integer,date) from public,anon;
grant execute on function public.enroll_fitness_program(text,integer,date) to authenticated;
commit;
