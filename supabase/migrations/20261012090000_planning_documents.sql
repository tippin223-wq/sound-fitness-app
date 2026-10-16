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
