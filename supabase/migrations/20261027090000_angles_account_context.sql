-- Shared identity; Angles enrollment and product access stay separate from coaching.
-- Requires the previously installed Angles assessment/MFA migration.
begin;
create table public.angles_accounts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  enrollment_source text not null check (enrollment_source in ('angles', 'sound_fitness')),
  access_plan text not null default 'free' check (access_plan in ('free', 'angles', 'sound_fitness')),
  access_expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.angles_accounts enable row level security;
revoke all on public.angles_accounts from public, anon, authenticated;
grant select on public.angles_accounts to authenticated;
create policy angles_accounts_read_own on public.angles_accounts for select to authenticated
  using (profile_id = (select auth.uid()) and (select public.angles_account_allowed()));

create function public.get_angles_account_context() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
  website_role text;
  account public.angles_accounts;
begin
  if owner is null or not public.angles_account_allowed() then
    raise exception 'Account verification required' using errcode = '42501';
  end if;
  select role into website_role from public.profiles where id = owner;
  if not found then raise exception 'Sound Fitness profile unavailable' using errcode = '42501'; end if;
  -- Signup metadata is only an enrollment label. It can never confer a role,
  -- paid access, a coaching relationship, or access to another person's data.
  insert into public.angles_accounts(profile_id, enrollment_source)
    select owner, case when raw_user_meta_data->>'signup_product' = 'angles'
      then 'angles' else 'sound_fitness' end from auth.users where id = owner
    on conflict (profile_id) do nothing;
  select * into strict account from public.angles_accounts where profile_id = owner;
  return jsonb_build_object(
    'id', owner,
    'role', case when website_role = 'coach' then 'coach' else 'training_user' end,
    'enrollmentSource', account.enrollment_source,
    'accessPlan', case when account.access_expires_at is not null and account.access_expires_at <= now()
      then 'free' else account.access_plan end
  );
end;
$$;
revoke all on function public.get_angles_account_context() from public, anon;
grant execute on function public.get_angles_account_context() to authenticated;
comment on table public.angles_accounts is 'Angles product enrollment; never proof of a coaching relationship. Paid grants are trusted server operations only.';
notify pgrst, 'reload schema';
commit;
