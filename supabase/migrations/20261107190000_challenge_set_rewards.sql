begin;
create table public.challenge_reward_definitions (
 category text not null, set_index integer not null check(set_index between 0 and 9),
 challenges jsonb not null, primary key(category,set_index)
);
create table public.challenge_reward_claims (
 profile_id uuid not null references public.profiles(id) on delete cascade,
 category text not null, set_index integer not null,
 claimed_at timestamptz not null default now(),
 primary key(profile_id,category,set_index),
 foreign key(category,set_index) references public.challenge_reward_definitions(category,set_index)
);
alter table public.challenge_reward_definitions enable row level security;
alter table public.challenge_reward_claims enable row level security;
revoke all on public.challenge_reward_definitions, public.challenge_reward_claims from public,anon,authenticated;
grant select on public.challenge_reward_claims to authenticated;
create policy challenge_claims_read_own on public.challenge_reward_claims for select to authenticated using(profile_id=auth.uid());

insert into public.challenge_reward_definitions(category,set_index,challenges) values
('strength',0,'[{"metric":"strength.sessions","target":1,"slot":0},{"metric":"strength.sets","target":3,"slot":1},{"metric":"strength.reps","target":10,"slot":2}]'::jsonb),
('strength',1,'[{"metric":"strength.sessions","target":2,"slot":0},{"metric":"strength.sets","target":8,"slot":1},{"metric":"strength.reps","target":30,"slot":2}]'::jsonb),
('strength',2,'[{"metric":"strength.sessions","target":4,"slot":0},{"metric":"strength.sets","target":16,"slot":1},{"metric":"strength.reps","target":60,"slot":2}]'::jsonb),
('strength',3,'[{"metric":"strength.sessions","target":6,"slot":0},{"metric":"strength.sets","target":28,"slot":1},{"metric":"strength.reps","target":100,"slot":2}]'::jsonb),
('strength',4,'[{"metric":"strength.sessions","target":9,"slot":0},{"metric":"strength.sets","target":42,"slot":1},{"metric":"strength.reps","target":160,"slot":2}]'::jsonb),
('strength',5,'[{"metric":"strength.sessions","target":12,"slot":0},{"metric":"strength.sets","target":60,"slot":1},{"metric":"strength.reps","target":240,"slot":2}]'::jsonb),
('strength',6,'[{"metric":"strength.sessions","target":16,"slot":0},{"metric":"strength.sets","target":85,"slot":1},{"metric":"strength.reps","target":340,"slot":2}]'::jsonb),
('strength',7,'[{"metric":"strength.sessions","target":21,"slot":0},{"metric":"strength.sets","target":115,"slot":1},{"metric":"strength.reps","target":460,"slot":2}]'::jsonb),
('strength',8,'[{"metric":"strength.sessions","target":27,"slot":0},{"metric":"strength.sets","target":150,"slot":1},{"metric":"strength.reps","target":600,"slot":2}]'::jsonb),
('strength',9,'[{"metric":"strength.sessions","target":35,"slot":0},{"metric":"strength.sets","target":200,"slot":1},{"metric":"strength.reps","target":800,"slot":2}]'::jsonb),
('cardio',0,'[{"metric":"cardio.sessions","target":1,"slot":0},{"metric":"cardio.minutes","target":10,"slot":1},{"metric":"cardio.days","target":1,"slot":2}]'::jsonb),
('cardio',1,'[{"metric":"cardio.sessions","target":2,"slot":0},{"metric":"cardio.minutes","target":25,"slot":1},{"metric":"cardio.days","target":2,"slot":2}]'::jsonb),
('cardio',2,'[{"metric":"cardio.sessions","target":4,"slot":0},{"metric":"cardio.minutes","target":50,"slot":1},{"metric":"cardio.days","target":4,"slot":2}]'::jsonb),
('cardio',3,'[{"metric":"cardio.sessions","target":6,"slot":0},{"metric":"cardio.minutes","target":90,"slot":1},{"metric":"cardio.days","target":6,"slot":2}]'::jsonb),
('cardio',4,'[{"metric":"cardio.sessions","target":9,"slot":0},{"metric":"cardio.minutes","target":140,"slot":1},{"metric":"cardio.days","target":9,"slot":2}]'::jsonb),
('cardio',5,'[{"metric":"cardio.sessions","target":12,"slot":0},{"metric":"cardio.minutes","target":200,"slot":1},{"metric":"cardio.days","target":12,"slot":2}]'::jsonb),
('cardio',6,'[{"metric":"cardio.sessions","target":16,"slot":0},{"metric":"cardio.minutes","target":280,"slot":1},{"metric":"cardio.days","target":16,"slot":2}]'::jsonb),
('cardio',7,'[{"metric":"cardio.sessions","target":21,"slot":0},{"metric":"cardio.minutes","target":380,"slot":1},{"metric":"cardio.days","target":21,"slot":2}]'::jsonb),
('cardio',8,'[{"metric":"cardio.sessions","target":27,"slot":0},{"metric":"cardio.minutes","target":500,"slot":1},{"metric":"cardio.days","target":27,"slot":2}]'::jsonb),
('cardio',9,'[{"metric":"cardio.sessions","target":35,"slot":0},{"metric":"cardio.minutes","target":650,"slot":1},{"metric":"cardio.days","target":35,"slot":2}]'::jsonb),
('mobility',0,'[{"metric":"mobility.sessions","target":1,"slot":0},{"metric":"mobility.sets","target":3,"slot":1},{"metric":"mobility.days","target":1,"slot":2}]'::jsonb),
('mobility',1,'[{"metric":"mobility.sessions","target":2,"slot":0},{"metric":"mobility.sets","target":8,"slot":1},{"metric":"mobility.days","target":2,"slot":2}]'::jsonb),
('mobility',2,'[{"metric":"mobility.sessions","target":4,"slot":0},{"metric":"mobility.sets","target":16,"slot":1},{"metric":"mobility.days","target":4,"slot":2}]'::jsonb),
('mobility',3,'[{"metric":"mobility.sessions","target":6,"slot":0},{"metric":"mobility.sets","target":28,"slot":1},{"metric":"mobility.days","target":6,"slot":2}]'::jsonb),
('mobility',4,'[{"metric":"mobility.sessions","target":9,"slot":0},{"metric":"mobility.sets","target":42,"slot":1},{"metric":"mobility.days","target":9,"slot":2}]'::jsonb),
('mobility',5,'[{"metric":"mobility.sessions","target":12,"slot":0},{"metric":"mobility.sets","target":60,"slot":1},{"metric":"mobility.days","target":12,"slot":2}]'::jsonb),
('mobility',6,'[{"metric":"mobility.sessions","target":16,"slot":0},{"metric":"mobility.sets","target":85,"slot":1},{"metric":"mobility.days","target":16,"slot":2}]'::jsonb),
('mobility',7,'[{"metric":"mobility.sessions","target":21,"slot":0},{"metric":"mobility.sets","target":115,"slot":1},{"metric":"mobility.days","target":21,"slot":2}]'::jsonb),
('mobility',8,'[{"metric":"mobility.sessions","target":27,"slot":0},{"metric":"mobility.sets","target":150,"slot":1},{"metric":"mobility.days","target":27,"slot":2}]'::jsonb),
('mobility',9,'[{"metric":"mobility.sessions","target":35,"slot":0},{"metric":"mobility.sets","target":200,"slot":1},{"metric":"mobility.days","target":35,"slot":2}]'::jsonb),
('recovery',0,'[{"metric":"recovery.checks","target":1,"slot":0},{"metric":"recovery.weeks","target":1,"slot":1},{"metric":"recovery.notes","target":1,"slot":2}]'::jsonb),
('recovery',1,'[{"metric":"recovery.checks","target":2,"slot":0},{"metric":"recovery.weeks","target":2,"slot":1},{"metric":"recovery.notes","target":2,"slot":2}]'::jsonb),
('recovery',2,'[{"metric":"recovery.checks","target":4,"slot":0},{"metric":"recovery.weeks","target":3,"slot":1},{"metric":"recovery.notes","target":3,"slot":2}]'::jsonb),
('recovery',3,'[{"metric":"recovery.checks","target":6,"slot":0},{"metric":"recovery.weeks","target":4,"slot":1},{"metric":"recovery.notes","target":4,"slot":2}]'::jsonb),
('recovery',4,'[{"metric":"recovery.checks","target":9,"slot":0},{"metric":"recovery.weeks","target":6,"slot":1},{"metric":"recovery.notes","target":5,"slot":2}]'::jsonb),
('recovery',5,'[{"metric":"recovery.checks","target":12,"slot":0},{"metric":"recovery.weeks","target":8,"slot":1},{"metric":"recovery.notes","target":7,"slot":2}]'::jsonb),
('recovery',6,'[{"metric":"recovery.checks","target":16,"slot":0},{"metric":"recovery.weeks","target":10,"slot":1},{"metric":"recovery.notes","target":9,"slot":2}]'::jsonb),
('recovery',7,'[{"metric":"recovery.checks","target":21,"slot":0},{"metric":"recovery.weeks","target":13,"slot":1},{"metric":"recovery.notes","target":12,"slot":2}]'::jsonb),
('recovery',8,'[{"metric":"recovery.checks","target":27,"slot":0},{"metric":"recovery.weeks","target":17,"slot":1},{"metric":"recovery.notes","target":16,"slot":2}]'::jsonb),
('recovery',9,'[{"metric":"recovery.checks","target":35,"slot":0},{"metric":"recovery.weeks","target":22,"slot":1},{"metric":"recovery.notes","target":20,"slot":2}]'::jsonb),
('consistency',0,'[{"metric":"training.sessions","target":1,"slot":0},{"metric":"training.days","target":1,"slot":1},{"metric":"training.weeks","target":1,"slot":2}]'::jsonb),
('consistency',1,'[{"metric":"training.sessions","target":2,"slot":0},{"metric":"training.days","target":2,"slot":1},{"metric":"training.weeks","target":2,"slot":2}]'::jsonb),
('consistency',2,'[{"metric":"training.sessions","target":4,"slot":0},{"metric":"training.days","target":4,"slot":1},{"metric":"training.weeks","target":3,"slot":2}]'::jsonb),
('consistency',3,'[{"metric":"training.sessions","target":6,"slot":0},{"metric":"training.days","target":6,"slot":1},{"metric":"training.weeks","target":4,"slot":2}]'::jsonb),
('consistency',4,'[{"metric":"training.sessions","target":9,"slot":0},{"metric":"training.days","target":9,"slot":1},{"metric":"training.weeks","target":5,"slot":2}]'::jsonb),
('consistency',5,'[{"metric":"training.sessions","target":12,"slot":0},{"metric":"training.days","target":12,"slot":1},{"metric":"training.weeks","target":7,"slot":2}]'::jsonb),
('consistency',6,'[{"metric":"training.sessions","target":16,"slot":0},{"metric":"training.days","target":16,"slot":1},{"metric":"training.weeks","target":9,"slot":2}]'::jsonb),
('consistency',7,'[{"metric":"training.sessions","target":21,"slot":0},{"metric":"training.days","target":21,"slot":1},{"metric":"training.weeks","target":12,"slot":2}]'::jsonb),
('consistency',8,'[{"metric":"training.sessions","target":27,"slot":0},{"metric":"training.days","target":27,"slot":1},{"metric":"training.weeks","target":16,"slot":2}]'::jsonb),
('consistency',9,'[{"metric":"training.sessions","target":35,"slot":0},{"metric":"training.days","target":35,"slot":1},{"metric":"training.weeks","target":20,"slot":2}]'::jsonb),
('nutrition',0,'[{"metric":"nutrition.meals","target":1,"slot":0},{"metric":"nutrition.water","target":1,"slot":1},{"metric":"nutrition.protein","target":1,"slot":2}]'::jsonb),
('nutrition',1,'[{"metric":"nutrition.meals","target":2,"slot":0},{"metric":"nutrition.water","target":2,"slot":1},{"metric":"nutrition.protein","target":2,"slot":2}]'::jsonb),
('nutrition',2,'[{"metric":"nutrition.meals","target":4,"slot":0},{"metric":"nutrition.water","target":4,"slot":1},{"metric":"nutrition.protein","target":4,"slot":2}]'::jsonb),
('nutrition',3,'[{"metric":"nutrition.meals","target":6,"slot":0},{"metric":"nutrition.water","target":6,"slot":1},{"metric":"nutrition.protein","target":6,"slot":2}]'::jsonb),
('nutrition',4,'[{"metric":"nutrition.meals","target":9,"slot":0},{"metric":"nutrition.water","target":9,"slot":1},{"metric":"nutrition.protein","target":9,"slot":2}]'::jsonb),
('nutrition',5,'[{"metric":"nutrition.meals","target":12,"slot":0},{"metric":"nutrition.water","target":12,"slot":1},{"metric":"nutrition.protein","target":12,"slot":2}]'::jsonb),
('nutrition',6,'[{"metric":"nutrition.meals","target":16,"slot":0},{"metric":"nutrition.water","target":16,"slot":1},{"metric":"nutrition.protein","target":16,"slot":2}]'::jsonb),
('nutrition',7,'[{"metric":"nutrition.meals","target":21,"slot":0},{"metric":"nutrition.water","target":21,"slot":1},{"metric":"nutrition.protein","target":21,"slot":2}]'::jsonb),
('nutrition',8,'[{"metric":"nutrition.meals","target":27,"slot":0},{"metric":"nutrition.water","target":27,"slot":1},{"metric":"nutrition.protein","target":27,"slot":2}]'::jsonb),
('nutrition',9,'[{"metric":"nutrition.meals","target":35,"slot":0},{"metric":"nutrition.water","target":35,"slot":1},{"metric":"nutrition.protein","target":35,"slot":2}]'::jsonb),
('performance',0,'[{"metric":"performance.sessions","target":1,"slot":0},{"metric":"performance.sets","target":3,"slot":1},{"metric":"performance.days","target":1,"slot":2}]'::jsonb),
('performance',1,'[{"metric":"performance.sessions","target":2,"slot":0},{"metric":"performance.sets","target":8,"slot":1},{"metric":"performance.days","target":2,"slot":2}]'::jsonb),
('performance',2,'[{"metric":"performance.sessions","target":4,"slot":0},{"metric":"performance.sets","target":16,"slot":1},{"metric":"performance.days","target":4,"slot":2}]'::jsonb),
('performance',3,'[{"metric":"performance.sessions","target":6,"slot":0},{"metric":"performance.sets","target":28,"slot":1},{"metric":"performance.days","target":6,"slot":2}]'::jsonb),
('performance',4,'[{"metric":"performance.sessions","target":9,"slot":0},{"metric":"performance.sets","target":42,"slot":1},{"metric":"performance.days","target":9,"slot":2}]'::jsonb),
('performance',5,'[{"metric":"performance.sessions","target":12,"slot":0},{"metric":"performance.sets","target":60,"slot":1},{"metric":"performance.days","target":12,"slot":2}]'::jsonb),
('performance',6,'[{"metric":"performance.sessions","target":16,"slot":0},{"metric":"performance.sets","target":85,"slot":1},{"metric":"performance.days","target":16,"slot":2}]'::jsonb),
('performance',7,'[{"metric":"performance.sessions","target":21,"slot":0},{"metric":"performance.sets","target":115,"slot":1},{"metric":"performance.days","target":21,"slot":2}]'::jsonb),
('performance',8,'[{"metric":"performance.sessions","target":27,"slot":0},{"metric":"performance.sets","target":150,"slot":1},{"metric":"performance.days","target":27,"slot":2}]'::jsonb),
('performance',9,'[{"metric":"performance.sessions","target":35,"slot":0},{"metric":"performance.sets","target":200,"slot":1},{"metric":"performance.days","target":35,"slot":2}]'::jsonb),
('learning',0,'[{"metric":"learning.lessons","target":1,"slot":0},{"metric":"learning.quizzes","target":1,"slot":1},{"metric":"learning.modules","target":1,"slot":2}]'::jsonb),
('learning',1,'[{"metric":"learning.lessons","target":2,"slot":0},{"metric":"learning.quizzes","target":2,"slot":1},{"metric":"learning.modules","target":2,"slot":2}]'::jsonb),
('learning',2,'[{"metric":"learning.lessons","target":4,"slot":0},{"metric":"learning.quizzes","target":3,"slot":1},{"metric":"learning.modules","target":3,"slot":2}]'::jsonb),
('learning',3,'[{"metric":"learning.lessons","target":6,"slot":0},{"metric":"learning.quizzes","target":4,"slot":1},{"metric":"learning.modules","target":4,"slot":2}]'::jsonb),
('learning',4,'[{"metric":"learning.lessons","target":9,"slot":0},{"metric":"learning.quizzes","target":6,"slot":1},{"metric":"learning.modules","target":5,"slot":2}]'::jsonb),
('learning',5,'[{"metric":"learning.lessons","target":12,"slot":0},{"metric":"learning.quizzes","target":8,"slot":1},{"metric":"learning.modules","target":6,"slot":2}]'::jsonb),
('learning',6,'[{"metric":"learning.lessons","target":16,"slot":0},{"metric":"learning.quizzes","target":10,"slot":1},{"metric":"learning.modules","target":8,"slot":2}]'::jsonb),
('learning',7,'[{"metric":"learning.lessons","target":21,"slot":0},{"metric":"learning.quizzes","target":13,"slot":1},{"metric":"learning.modules","target":10,"slot":2}]'::jsonb),
('learning',8,'[{"metric":"learning.lessons","target":27,"slot":0},{"metric":"learning.quizzes","target":17,"slot":1},{"metric":"learning.modules","target":13,"slot":2}]'::jsonb),
('learning',9,'[{"metric":"learning.lessons","target":35,"slot":0},{"metric":"learning.quizzes","target":22,"slot":1},{"metric":"learning.modules","target":16,"slot":2}]'::jsonb),
('community',0,'[{"metric":"community.activities","target":1,"slot":0},{"metric":"community.contributions","target":1,"slot":1},{"metric":"community.events","target":1,"slot":2}]'::jsonb),
('community',1,'[{"metric":"community.activities","target":2,"slot":0},{"metric":"community.contributions","target":2,"slot":1},{"metric":"community.events","target":2,"slot":2}]'::jsonb),
('community',2,'[{"metric":"community.activities","target":4,"slot":0},{"metric":"community.contributions","target":3,"slot":1},{"metric":"community.events","target":3,"slot":2}]'::jsonb),
('community',3,'[{"metric":"community.activities","target":6,"slot":0},{"metric":"community.contributions","target":5,"slot":1},{"metric":"community.events","target":4,"slot":2}]'::jsonb),
('community',4,'[{"metric":"community.activities","target":9,"slot":0},{"metric":"community.contributions","target":7,"slot":1},{"metric":"community.events","target":5,"slot":2}]'::jsonb),
('community',5,'[{"metric":"community.activities","target":12,"slot":0},{"metric":"community.contributions","target":10,"slot":1},{"metric":"community.events","target":6,"slot":2}]'::jsonb),
('community',6,'[{"metric":"community.activities","target":16,"slot":0},{"metric":"community.contributions","target":14,"slot":1},{"metric":"community.events","target":8,"slot":2}]'::jsonb),
('community',7,'[{"metric":"community.activities","target":21,"slot":0},{"metric":"community.contributions","target":19,"slot":1},{"metric":"community.events","target":10,"slot":2}]'::jsonb),
('community',8,'[{"metric":"community.activities","target":27,"slot":0},{"metric":"community.contributions","target":25,"slot":1},{"metric":"community.events","target":13,"slot":2}]'::jsonb),
('community',9,'[{"metric":"community.activities","target":35,"slot":0},{"metric":"community.contributions","target":32,"slot":1},{"metric":"community.events","target":16,"slot":2}]'::jsonb);

-- Only persisted, completed workouts with recorded sets establish workout credit.
-- No client-supplied amounts, completion flags, or local preview balances are accepted.
create function public.sync_challenge_rewards() returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare metrics jsonb := '{}'::jsonb; definition record; challenge jsonb;
 target_value numeric; metric_value numeric; eligible boolean; awarded integer:=0; inserted integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,482));
 with completed as (
  select w.id,(w.completed_at at time zone 'America/Los_Angeles')::date training_day
  from public.workout_logs w where w.profile_id=auth.uid() and w.status='completed'
  and w.completed_at<=now() and exists(select 1 from public.workout_set_logs s
    where s.workout_log_id=w.id and s.profile_id=auth.uid() and s.sets>0)
 ) select jsonb_build_object('training.sessions',count(*),'training.days',count(distinct training_day),
   'training.weeks',count(distinct date_trunc('week',training_day))) into metrics from completed;

 with patterns(pattern,category) as (values ('squat','strength'),('squat','strength'),('hinge','strength'),('hinge','strength'),('lunge','strength'),('lunge','strength'),('step-up','strength'),('step-up','strength'),('hip-thrust-bridge','strength'),('hip thrust / bridge','strength'),('knee-extension','strength'),('knee extension','strength'),('knee-flexion','strength'),('knee flexion','strength'),('hip-abduction','strength'),('hip abduction','strength'),('hip-adduction','strength'),('hip adduction','strength'),('hip-internal-rotation','strength'),('hip internal rotation','strength'),('hip-external-rotation','strength'),('hip external rotation','strength'),('calf-raise','strength'),('calf raise','strength'),('tibialis-raise','strength'),('tibialis raise','strength'),('chest-press','strength'),('chest press','strength'),('shoulder-press','strength'),('shoulder press','strength'),('chest-fly','strength'),('chest fly','strength'),('lateral-raise','strength'),('lateral raise','strength'),('row','strength'),('row','strength'),('vertical-pull','strength'),('vertical pull','strength'),('pullover','strength'),('pullover','strength'),('reverse-fly','strength'),('reverse fly','strength'),('curl','strength'),('curl','strength'),('triceps-extension','strength'),('triceps extension','strength'),('wrist-flexion','strength'),('wrist flexion','strength'),('wrist-extension','strength'),('wrist extension','strength'),('wrist-rotation','strength'),('wrist rotation','strength'),('shoulder-internal-rotation','strength'),('shoulder internal rotation','strength'),('shoulder-external-rotation','strength'),('shoulder external rotation','strength'),('scapular-control','strength'),('scapular control','strength'),('rotation','strength'),('rotation','strength'),('anti-rotation','strength'),('anti-rotation','strength'),('flexion','strength'),('flexion','strength'),('anti-extension','strength'),('anti-extension','strength'),('anti-lateral-flexion','strength'),('anti-lateral flexion','strength'),('carry','performance'),('carry','performance'),('crawl','performance'),('crawl','performance'),('jump','performance'),('jump','performance'),('sprint','performance'),('sprint','performance'),('throw','performance'),('throw','performance'),('mobility','mobility'),('mobility','mobility'),('breathing-bracing','mobility'),('breathing / bracing','mobility'),('neck-flexion','strength'),('neck flexion','strength'),('neck-extension','strength'),('neck extension','strength'),('neck-rotation','strength'),('neck rotation','strength'),('integrated-movement','strength'),('integrated movement','strength')), activity as (
 select w.id,(w.completed_at at time zone 'America/Los_Angeles')::date training_day,p.category,s.sets,s.reps
 from public.workout_logs w join public.workout_set_logs s on s.workout_log_id=w.id and s.profile_id=auth.uid()
 join (select distinct * from patterns) p on p.pattern=lower(s.pattern)
 where w.profile_id=auth.uid() and w.status='completed' and w.completed_at<=now() and s.sets>0
 ), totals as (select category,count(distinct id) sessions,count(distinct training_day) days,sum(sets) sets,sum(sets::bigint*reps) reps from activity group by category), pairs as (
 select category||'.sessions' key,sessions value from totals union all select category||'.days',days from totals
 union all select category||'.sets',sets from totals union all select category||'.reps',reps from totals)
 select metrics||coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into metrics from pairs;
 with document as (select payload from public.planning_documents where profile_id=auth.uid()),
 meals as (select row from document cross join lateral jsonb_array_elements(
  case when jsonb_typeof(payload->'soundFitnessMealEntries')='array' then payload->'soundFitnessMealEntries' else '[]'::jsonb end) row
  where row->>'date' ~ '^\d{4}-\d{2}-\d{2}$' and (row->>'date')::date <= (now() at time zone 'America/Los_Angeles')::date
  and (row->>'recordedAt')::timestamptz<=now() and (row->>'updatedAt')::timestamptz<=now()),
 water as (select row from document cross join lateral jsonb_array_elements(
  case when jsonb_typeof(payload->'soundFitnessHydrationEntries')='array' then payload->'soundFitnessHydrationEntries' else '[]'::jsonb end) row
  where row->>'date' ~ '^\d{4}-\d{2}-\d{2}$' and (row->>'date')::date <= (now() at time zone 'America/Los_Angeles')::date
  and (row->>'recordedAt')::timestamptz<=now() and (row->>'updatedAt')::timestamptz<=now()),
 checks as (select row from document cross join lateral jsonb_array_elements(
  case when jsonb_typeof(payload->'soundFitnessWeeklyCheckIns')='array' then payload->'soundFitnessWeeklyCheckIns' else '[]'::jsonb end) row
  where row->>'weekStart' ~ '^\d{4}-\d{2}-\d{2}$' and (row->>'weekStart')::date <= (now() at time zone 'America/Los_Angeles')::date
  and (row->>'savedAt')::timestamptz<=now())
 select metrics||jsonb_build_object(
  'nutrition.meals',(select count(distinct row->>'date') from meals),
  'nutrition.protein',(select count(distinct row->>'date') from meals where jsonb_typeof(row->'protein')='number' and (row->>'protein')::numeric>0),
  'nutrition.water',(select count(distinct row->>'date') from water),
  'recovery.checks',(select count(distinct row->>'weekStart') from checks),
  'recovery.weeks',(select count(distinct row->>'weekStart') from checks),
  'recovery.notes',(select count(distinct row->>'weekStart') from checks where length(btrim(row->>'notes'))>0)) into metrics;
 -- Categories without a reliable persisted completion source remain ineligible.
 for definition in select * from public.challenge_reward_definitions order by category,set_index loop
  eligible:=true;
  for challenge in select value from jsonb_array_elements(definition.challenges) loop
   target_value:=(challenge->>'target')::numeric;
   -- Published target changes use the same content bank as the member card.
   select case when fields->>'Target' ~ '^[1-9][0-9]{0,8}$' then (fields->>'Target')::numeric else target_value end
    into target_value from public.app_content_publications where bank='challenges'
    and source_key=definition.category||':'||definition.set_index||':'||(challenge->>'slot');
   target_value:=coalesce(target_value,(challenge->>'target')::numeric);
   metric_value:=(metrics->>(challenge->>'metric'))::numeric;
   if metric_value is null or metric_value<target_value then eligible:=false; exit; end if;
  end loop;
  if not eligible or exists(select 1 from public.challenge_reward_definitions earlier
    where earlier.category=definition.category and earlier.set_index<definition.set_index
    and not exists(select 1 from public.challenge_reward_claims c where c.profile_id=auth.uid()
      and c.category=earlier.category and c.set_index=earlier.set_index)) then continue; end if;
  insert into public.challenge_reward_claims(profile_id,category,set_index)
   values(auth.uid(),definition.category,definition.set_index) on conflict do nothing;
  get diagnostics inserted=row_count;
  awarded:=awarded+inserted;
 end loop;
 return awarded;
end $$;
revoke all on function public.sync_challenge_rewards() from public,anon;
grant execute on function public.sync_challenge_rewards() to authenticated;

create or replace function public.member_reward_balances() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare balances jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform public.sync_challenge_rewards();
 select jsonb_object_agg(asset,total) into balances from (
  select assets.asset,coalesce(sum(credits.amount),0) total
  from unnest(array['coins','bolts','sapphire','topaz','ruby','emerald']) assets(asset)
  left join (
   select c.asset,c.amount::bigint from public.weekly_reward_credits c where c.profile_id=auth.uid()
   union all
   select a.asset,((c.set_index+1)*a.amount)::bigint
    from public.challenge_reward_claims c cross join (values('coins',100),('bolts',25),('sapphire',2)) a(asset,amount)
    where c.profile_id=auth.uid()
  ) credits on credits.asset=assets.asset group by assets.asset
 ) totals;
 return balances;
end $$;
revoke all on function public.member_reward_balances() from public,anon;
grant execute on function public.member_reward_balances() to authenticated;

-- Keep roulette refreshes from replacing the combined account balance.
alter function public.weekly_reward_spin_status() rename to weekly_reward_spin_status_before_challenges;
revoke all on function public.weekly_reward_spin_status_before_challenges() from public,anon,authenticated;
create function public.weekly_reward_spin_status() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 return public.weekly_reward_spin_status_before_challenges() || jsonb_build_object('balances',public.member_reward_balances());
end $$;
revoke all on function public.weekly_reward_spin_status() from public,anon;
grant execute on function public.weekly_reward_spin_status() to authenticated;
commit;

