-- Wallet reads must not depend on roulette eligibility or pending-reveal logic.
create or replace function public.member_reward_balances()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare balances jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select jsonb_object_agg(asset,total) into balances from (
    select assets.asset,coalesce(sum(c.amount),0) as total
    from unnest(array['coins','bolts','sapphire','topaz','ruby','emerald']) assets(asset)
    left join public.weekly_reward_credits c on c.asset=assets.asset and c.profile_id=auth.uid()
    group by assets.asset
  ) totals;
  return balances;
end $$;
revoke all on function public.member_reward_balances() from public,anon;
grant execute on function public.member_reward_balances() to authenticated;
