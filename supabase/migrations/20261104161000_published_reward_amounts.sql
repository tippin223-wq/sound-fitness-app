begin;
-- Amounts apply to future server-selected awards only. No eligibility, odds,
-- asset choice, past award, or member balance can be changed by a browser.
create function public.published_weekly_reward_amount(reward text,grade integer,fallback integer)
returns integer language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce((select (fields->>'Amount')::integer from app_content_publications
   where bank='rewards' and source_key='weekly:'||reward||':'||grade
     and fields->>'Amount' ~ '^[1-9][0-9]{0,3}$'),fallback)
$$;
revoke all on function public.published_weekly_reward_amount(text,integer,integer) from public,anon,authenticated;
do $$
declare original text; revised text;
begin
 select pg_get_functiondef('public.claim_weekly_reward_spin(date)'::regprocedure) into original;
 revised:=replace(original,'coins:=(array[25,50,100,200,500])[grade+1];','coins:=public.published_weekly_reward_amount(''sound-points'',grade,(array[25,50,100,200,500])[grade+1]);');
 revised:=replace(revised,'bolts:=(array[1,2,3,5,10])[grade+1];','bolts:=public.published_weekly_reward_amount(''recovery-credit'',grade,(array[1,2,3,5,10])[grade+1]);');
 revised:=replace(revised,'elsif item=2 then gems:=(array[0,0,1,2,5])[grade+1];','elsif item=2 then gems:=public.published_weekly_reward_amount(''emerald'',grade,(array[0,0,1,2,5])[grade+1]);');
 if revised=original or strpos(revised,'public.published_weekly_reward_amount(''emerald''')=0 then raise exception 'Reward claim source differs; review before applying'; end if;
 execute revised;
end $$;
commit;
