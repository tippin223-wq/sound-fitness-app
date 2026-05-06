create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  goal text,
  source text not null default 'builder',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_templates_title_not_blank check (length(trim(title)) > 0),
  constraint workout_templates_status_check check (
    status in ('draft', 'active', 'archived')
  )
);

create table public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id text,
  exercise_name text not null,
  body text,
  pattern text,
  equipment text,
  order_index integer not null default 0,
  target_sets integer,
  target_reps text,
  target_rest_seconds integer,
  tempo text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_template_exercises_name_not_blank check (
    length(trim(exercise_name)) > 0
  ),
  constraint workout_template_exercises_order_non_negative check (order_index >= 0),
  constraint workout_template_exercises_target_sets_positive check (
    target_sets is null or target_sets > 0
  ),
  constraint workout_template_exercises_rest_non_negative check (
    target_rest_seconds is null or target_rest_seconds >= 0
  )
);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  workout_template_id uuid references public.workout_templates(id) on delete set null,
  title text not null,
  status text not null default 'completed',
  started_at timestamptz,
  completed_at timestamptz,
  source text not null default 'workout-session',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_logs_id_profile_id_unique unique (id, profile_id),
  constraint workout_logs_title_not_blank check (length(trim(title)) > 0),
  constraint workout_logs_status_check check (
    status in ('planned', 'in_progress', 'completed', 'cancelled')
  )
);

create table public.workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id text,
  exercise_name text not null,
  body text,
  pattern text,
  equipment text,
  weight numeric,
  reps integer,
  sets integer,
  performed_at timestamptz not null default now(),
  source text not null default 'workout-session',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_set_logs_workout_log_profile_fk foreign key (
    workout_log_id,
    profile_id
  ) references public.workout_logs(id, profile_id) on delete cascade,
  constraint workout_set_logs_name_not_blank check (length(trim(exercise_name)) > 0),
  constraint workout_set_logs_weight_non_negative check (
    weight is null or weight >= 0
  ),
  constraint workout_set_logs_reps_positive check (reps is null or reps > 0),
  constraint workout_set_logs_sets_positive check (sets is null or sets > 0),
  constraint workout_set_logs_order_non_negative check (order_index >= 0)
);

create index workout_templates_owner_profile_id_idx
  on public.workout_templates(owner_profile_id);

create index workout_templates_owner_status_idx
  on public.workout_templates(owner_profile_id, status);

create index workout_template_exercises_template_id_idx
  on public.workout_template_exercises(workout_template_id);

create index workout_template_exercises_template_order_idx
  on public.workout_template_exercises(workout_template_id, order_index);

create index workout_logs_profile_id_idx
  on public.workout_logs(profile_id);

create index workout_logs_workout_template_id_idx
  on public.workout_logs(workout_template_id);

create index workout_logs_profile_completed_at_idx
  on public.workout_logs(profile_id, completed_at desc);

create index workout_set_logs_workout_log_id_idx
  on public.workout_set_logs(workout_log_id);

create index workout_set_logs_profile_id_idx
  on public.workout_set_logs(profile_id);

create index workout_set_logs_profile_performed_at_idx
  on public.workout_set_logs(profile_id, performed_at desc);

create index workout_set_logs_exercise_id_idx
  on public.workout_set_logs(exercise_id);

create trigger set_workout_templates_updated_at
  before update on public.workout_templates
  for each row execute function public.set_updated_at();

create trigger set_workout_template_exercises_updated_at
  before update on public.workout_template_exercises
  for each row execute function public.set_updated_at();

create trigger set_workout_logs_updated_at
  before update on public.workout_logs
  for each row execute function public.set_updated_at();

create trigger set_workout_set_logs_updated_at
  before update on public.workout_set_logs
  for each row execute function public.set_updated_at();

alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.workout_set_logs enable row level security;

create policy "Users can select their own workout templates"
  on public.workout_templates
  for select
  using (owner_profile_id = auth.uid());

create policy "Users can insert their own workout templates"
  on public.workout_templates
  for insert
  with check (owner_profile_id = auth.uid());

create policy "Users can update their own workout templates"
  on public.workout_templates
  for update
  using (owner_profile_id = auth.uid())
  with check (owner_profile_id = auth.uid());

create policy "Users can delete their own workout templates"
  on public.workout_templates
  for delete
  using (owner_profile_id = auth.uid());

create policy "Users can select exercises from owned workout templates"
  on public.workout_template_exercises
  for select
  using (
    exists (
      select 1
      from public.workout_templates
      where workout_templates.id = workout_template_exercises.workout_template_id
        and workout_templates.owner_profile_id = auth.uid()
    )
  );

create policy "Users can insert exercises into owned workout templates"
  on public.workout_template_exercises
  for insert
  with check (
    exists (
      select 1
      from public.workout_templates
      where workout_templates.id = workout_template_exercises.workout_template_id
        and workout_templates.owner_profile_id = auth.uid()
    )
  );

create policy "Users can update exercises in owned workout templates"
  on public.workout_template_exercises
  for update
  using (
    exists (
      select 1
      from public.workout_templates
      where workout_templates.id = workout_template_exercises.workout_template_id
        and workout_templates.owner_profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_templates
      where workout_templates.id = workout_template_exercises.workout_template_id
        and workout_templates.owner_profile_id = auth.uid()
    )
  );

create policy "Users can delete exercises from owned workout templates"
  on public.workout_template_exercises
  for delete
  using (
    exists (
      select 1
      from public.workout_templates
      where workout_templates.id = workout_template_exercises.workout_template_id
        and workout_templates.owner_profile_id = auth.uid()
    )
  );

create policy "Users can select their own workout logs"
  on public.workout_logs
  for select
  using (profile_id = auth.uid());

create policy "Users can insert their own workout logs"
  on public.workout_logs
  for insert
  with check (
    profile_id = auth.uid()
    and (
      workout_template_id is null
      or exists (
        select 1
        from public.workout_templates
        where workout_templates.id = workout_logs.workout_template_id
          and workout_templates.owner_profile_id = auth.uid()
      )
    )
  );

create policy "Users can update their own workout logs"
  on public.workout_logs
  for update
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and (
      workout_template_id is null
      or exists (
        select 1
        from public.workout_templates
        where workout_templates.id = workout_logs.workout_template_id
          and workout_templates.owner_profile_id = auth.uid()
      )
    )
  );

create policy "Users can delete their own workout logs"
  on public.workout_logs
  for delete
  using (profile_id = auth.uid());

create policy "Users can select their own workout set logs"
  on public.workout_set_logs
  for select
  using (profile_id = auth.uid());

create policy "Users can insert their own workout set logs"
  on public.workout_set_logs
  for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.workout_logs
      where workout_logs.id = workout_set_logs.workout_log_id
        and workout_logs.profile_id = auth.uid()
    )
  );

create policy "Users can update their own workout set logs"
  on public.workout_set_logs
  for update
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.workout_logs
      where workout_logs.id = workout_set_logs.workout_log_id
        and workout_logs.profile_id = auth.uid()
    )
  );

create policy "Users can delete their own workout set logs"
  on public.workout_set_logs
  for delete
  using (profile_id = auth.uid());
