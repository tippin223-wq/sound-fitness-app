-- Prize icons and their awards will be configured separately. Preserve earned
-- weeks and previous records; never consume a spin for a provisional prize.
create or replace function public.claim_weekly_reward_spin(requested_week date)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  raise exception 'Rewards are being configured. Your earned spins are saved.' using errcode = '22023';
end $$;
revoke all on function public.claim_weekly_reward_spin(date) from public, anon;
grant execute on function public.claim_weekly_reward_spin(date) to authenticated;
