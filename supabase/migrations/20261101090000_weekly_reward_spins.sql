-- Rewards are account-owned, server-selected, and immutable to members.
create table public.weekly_reward_spins (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  days_trained integer not null check (days_trained between 1 and 7),
  tier text not null check (tier in ('common','uncommon','rare','epic','emerald')),
  currency text not null check (currency in ('points','tokens','emeralds')),
  amount integer not null check (amount > 0),
  claimed_at timestamptz not null default now(),
  primary key (profile_id, week_start)
);
alter table public.weekly_reward_spins enable row level security;
create policy weekly_reward_spins_read_own on public.weekly_reward_spins
  for select to authenticated using (profile_id = auth.uid());
revoke all on public.weekly_reward_spins from anon, authenticated;
grant select on public.weekly_reward_spins to authenticated;

-- Pacific time matches the weekly Sunday-night reset. Multiple sessions on
-- one date count once. Only completed relational workouts with recorded sets count.
create function public.weekly_reward_spin_status()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare current_week date := date_trunc('week', now() at time zone 'America/Los_Angeles')::date;
  eligible record; current_days integer; balances jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  with days as (
    select distinct (w.completed_at at time zone 'America/Los_Angeles')::date as day
    from public.workout_logs w where w.profile_id = auth.uid() and w.status = 'completed'
      and w.completed_at <= now() and w.completed_at >= '2026-10-26T00:00:00-07:00'::timestamptz
      and exists (select 1 from public.workout_set_logs s where s.workout_log_id = w.id and s.profile_id = auth.uid() and s.sets > 0)
  ), weeks as (
    select date_trunc('week', day)::date as week_start, count(*)::integer as days_trained from days group by 1
  ) select w.*, count(*) over () as available_spins into eligible from weeks w where w.week_start < current_week
    and not exists (select 1 from public.weekly_reward_spins r where r.profile_id = auth.uid() and r.week_start = w.week_start)
    order by w.week_start limit 1;
  select count(distinct (w.completed_at at time zone 'America/Los_Angeles')::date) into current_days
    from public.workout_logs w where w.profile_id = auth.uid() and w.status = 'completed'
      and w.completed_at >= (current_week::timestamp at time zone 'America/Los_Angeles') and w.completed_at <= now()
      and exists (select 1 from public.workout_set_logs s where s.workout_log_id = w.id and s.profile_id = auth.uid() and s.sets > 0);
  select jsonb_build_object('points', coalesce(sum(amount) filter (where currency = 'points'),0),
    'tokens',coalesce(sum(amount) filter (where currency = 'tokens'),0),
    'emeralds',coalesce(sum(amount) filter (where currency = 'emeralds'),0)) into balances
    from public.weekly_reward_spins where profile_id = auth.uid();
  return jsonb_build_object('weekStart', eligible.week_start, 'daysTrained', coalesce(eligible.days_trained,0), 'availableSpins', coalesce(eligible.available_spins,0),
    'currentDays', current_days, 'unlocksAt', ((current_week + 7)::timestamp at time zone 'America/Los_Angeles'), 'balances', balances,
    'lastPrize', (select to_jsonb(r) from public.weekly_reward_spins r where profile_id = auth.uid() order by week_start desc limit 1));
end $$;

create function public.claim_weekly_reward_spin(requested_week date)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare status jsonb; earned_days integer; roll integer; rare_cut integer; epic_cut integer; gem_cut integer;
  prize public.weekly_reward_spins;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 481));
  -- Same-week retries return the original prize, including parallel-device requests.
  select * into prize from public.weekly_reward_spins where profile_id = auth.uid() and week_start = requested_week;
  if found then return to_jsonb(prize); end if;
  status := public.weekly_reward_spin_status();
  if requested_week is null or requested_week is distinct from (status->>'weekStart')::date then
    raise exception 'No earned spin is available for this week' using errcode = '22023';
  end if;
  earned_days := (status->>'daysTrained')::integer;
  -- Integer odds out of 10000; rare+ increases from 6% (one day) to 42% (seven).
  gem_cut := earned_days * 50; epic_cut := gem_cut + earned_days * 150;
  rare_cut := epic_cut + earned_days * 400;
  roll := (('x' || left(replace(pg_catalog.gen_random_uuid()::text,'-',''),8))::bit(32)::bigint % 10000)::integer;
  insert into public.weekly_reward_spins(profile_id,week_start,days_trained,tier,currency,amount)
  values (auth.uid(), requested_week, earned_days,
    case when roll < gem_cut then 'emerald' when roll < epic_cut then 'epic' when roll < rare_cut then 'rare' when roll < rare_cut + 2500 then 'uncommon' else 'common' end,
    case when roll < gem_cut then 'emeralds' when roll < rare_cut then 'tokens' else 'points' end,
    case when roll < gem_cut then 1 when roll < epic_cut then 5 when roll < rare_cut then 1 when roll < rare_cut + 2500 then 100 else 25 end)
  returning * into prize;
  return to_jsonb(prize);
end $$;
revoke all on function public.weekly_reward_spin_status() from public, anon;
revoke all on function public.claim_weekly_reward_spin(date) from public, anon;
grant execute on function public.weekly_reward_spin_status() to authenticated;
grant execute on function public.claim_weekly_reward_spin(date) to authenticated;
