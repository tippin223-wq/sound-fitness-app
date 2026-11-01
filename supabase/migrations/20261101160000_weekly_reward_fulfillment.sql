-- Real weekly awards: the server owns eligibility, selection and account credit.
-- Legacy spin records remain intact. No profile cache is treated as currency.
begin;
alter table public.weekly_reward_spins drop constraint weekly_reward_spins_tier_check;
alter table public.weekly_reward_spins add constraint weekly_reward_spins_tier_check
  check (tier in ('common','uncommon','rare','epic','legendary','emerald'));
alter table public.weekly_reward_spins alter column currency drop not null;
alter table public.weekly_reward_spins alter column amount drop not null;
alter table public.weekly_reward_spins add column reward_id text;
alter table public.weekly_reward_spins add column award jsonb;
alter table public.weekly_reward_spins add column revealed_at timestamptz;
alter table public.weekly_reward_spins add constraint weekly_reward_award_object
  check (award is null or jsonb_typeof(award) = 'object');

create table public.weekly_reward_credits (
  profile_id uuid not null,
  week_start date not null,
  asset text not null check (asset in ('coins','bolts','sapphire','topaz','ruby','emerald')),
  amount integer not null check (amount > 0),
  primary key (profile_id, week_start, asset),
  foreign key (profile_id, week_start) references public.weekly_reward_spins(profile_id, week_start) on delete cascade
);
alter table public.weekly_reward_credits enable row level security;
revoke all on public.weekly_reward_credits from public, anon, authenticated;
grant select on public.weekly_reward_credits to authenticated;
create policy weekly_reward_credits_read_own on public.weekly_reward_credits
  for select to authenticated using (profile_id = auth.uid());

-- Preserve any earlier genuine awards, without importing editable profile data.
insert into public.weekly_reward_credits(profile_id,week_start,asset,amount)
select profile_id,week_start,case currency when 'points' then 'bolts' when 'tokens' then 'coins' else 'emerald' end,amount
from public.weekly_reward_spins where currency is not null and amount is not null;

alter function public.weekly_reward_spin_status() rename to weekly_reward_eligibility;
revoke all on function public.weekly_reward_eligibility() from public, anon, authenticated;

create function public.weekly_reward_spin_status()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare state jsonb; balances jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  state := public.weekly_reward_eligibility();
  select jsonb_object_agg(asset,total) into balances from (
    select assets.asset,coalesce(sum(c.amount),0) as total
    from unnest(array['coins','bolts','sapphire','topaz','ruby','emerald']) assets(asset)
    left join public.weekly_reward_credits c on c.asset=assets.asset and c.profile_id=auth.uid()
    group by assets.asset
  ) totals;
  return state || jsonb_build_object('rewardsReady',true,'balances',balances,
    'enabledRewardIds',jsonb_build_array('sound-points','recovery-credit','emerald','rare-crate'),
    'pendingReveal',(select award from public.weekly_reward_spins where profile_id=auth.uid()
      and award is not null and revealed_at is null order by week_start limit 1));
end $$;

create or replace function public.claim_weekly_reward_spin(requested_week date)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare state jsonb; prize public.weekly_reward_spins; earned_days integer; odds integer[];
  roll integer; cutoff integer:=0; grade integer:=0; item integer; reward text; rarity text;
  coins integer:=0; bolts integer:=0; gems integer:=0; gem text; gem_roll integer;
  award_total text; award_detail text; credits jsonb; result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,481));
  select * into prize from public.weekly_reward_spins where profile_id=auth.uid() and week_start=requested_week;
  if found then return coalesce(prize.award,to_jsonb(prize)); end if;
  state:=public.weekly_reward_spin_status();
  if requested_week is null or requested_week is distinct from (state->>'weekStart')::date then
    raise exception 'No earned spin is available for this week' using errcode='22023';
  end if;
  if state->'pendingReveal' <> 'null'::jsonb then
    raise exception 'View your previous reward before spinning again' using errcode='22023';
  end if;
  earned_days:=(state->>'daysTrained')::integer;
  odds:=case earned_days when 1 then array[100,0,0,0,0] when 2 then array[70,30,0,0,0]
    when 3 then array[50,32,18,0,0] when 4 then array[38,32,23,7,0]
    when 5 then array[28,30,27,12,3] when 6 then array[20,29,31,15,5] else array[15,25,33,20,7] end;
  roll:=floor(random()*100)::integer;
  for i in 1..5 loop cutoff:=cutoff+odds[i]; if roll<cutoff then grade:=i-1; exit; end if; end loop;
  rarity:=(array['common','uncommon','rare','epic','legendary'])[grade+1];
  -- Only fulfilled currency prizes enter the live pool. Upcoming inventory is locked.
  item:=floor(random()*(case when grade>=2 then 4 else 2 end))::integer;
  reward:=(array['sound-points','recovery-credit','emerald','rare-crate'])[item+1];
  if item=0 then coins:=(array[25,50,100,200,500])[grade+1];
  elsif item=1 then bolts:=(array[1,2,3,5,10])[grade+1];
  elsif item=2 then gems:=(array[0,0,1,2,5])[grade+1];
  else coins:=(array[0,0,100,250,500])[grade+1]; bolts:=(array[0,0,3,5,10])[grade+1]; gems:=(array[0,0,1,2,5])[grade+1]; end if;
  if gems>0 then
    gem_roll:=floor(random()*100)::integer;
    gem:=case when gem_roll<45 then 'sapphire' when gem_roll<75 then 'topaz' when gem_roll<95 then 'ruby' else 'emerald' end;
  end if;
  credits:='{}'::jsonb;
  if coins>0 then credits:=credits||jsonb_build_object('coins',coins); end if;
  if bolts>0 then credits:=credits||jsonb_build_object('bolts',bolts); end if;
  if gems>0 then credits:=credits||jsonb_build_object(gem,gems); end if;
  award_total:=concat_ws(' + ',case when coins>0 then coins||' coins' end,case when bolts>0 then bolts||' bolts' end,
    case when gems>0 then gems||' '||initcap(gem)||case when gems=1 then ' gem' else ' gems' end end);
  award_detail:=case item when 0 then 'Use coins to purchase items after unlocking them with the appropriate gems.'
    when 1 then 'Bolts cover participation in future fitness brackets after unlocking them with rubies. Current earning challenges remain free.'
    when 2 then case gem when 'sapphire' then 'Sapphires unlock avatar clothing, accessories and emotes.'
      when 'topaz' then 'Topaz unlocks app backgrounds, highlights and visual effects.'
      when 'ruby' then 'Rubies unlock future fitness brackets and progression activities.'
      else 'Emeralds are saved toward Sound Fitness services. Service redemption will be available separately.' end
    else 'Your chest contains all the currencies listed above.' end;
  result:=jsonb_build_object('weekStart',requested_week,'daysTrained',earned_days,'rewardId',reward,
    'tier',grade,'rarity',rarity,'amount',award_total,'detail',award_detail,'credits',credits,'gemType',gem);
  insert into public.weekly_reward_spins(profile_id,week_start,days_trained,tier,reward_id,award)
    values(auth.uid(),requested_week,earned_days,rarity,reward,result);
  insert into public.weekly_reward_credits(profile_id,week_start,asset,amount)
    select auth.uid(),requested_week,key,value::integer from jsonb_each_text(credits);
  return result;
end $$;

create function public.acknowledge_weekly_reward(requested_week date)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.weekly_reward_spins set revealed_at=coalesce(revealed_at,now())
    where profile_id=auth.uid() and week_start=requested_week and award is not null;
end $$;
revoke all on function public.weekly_reward_spin_status() from public, anon;
revoke all on function public.claim_weekly_reward_spin(date) from public, anon;
revoke all on function public.acknowledge_weekly_reward(date) from public, anon;
grant execute on function public.weekly_reward_spin_status(),public.claim_weekly_reward_spin(date),public.acknowledge_weekly_reward(date) to authenticated;
commit;
