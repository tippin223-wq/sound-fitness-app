-- Independent trainer-owned workspace. No writes to member plans or billing.
create table public.trainer_hub_workspaces (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  document jsonb not null,
  revision bigint not null check (revision > 0),
  last_mutation_id uuid not null,
  updated_at timestamptz not null default now(),
  constraint trainer_hub_document_shape check ((
    jsonb_typeof(document) = 'object' and document->>'version' = '1'
    and jsonb_typeof(document->'business') = 'object'
    and jsonb_typeof(document->'clients') = 'array'
    and jsonb_typeof(document->'programs') = 'array'
    and jsonb_typeof(document->'assignments') = 'array'
    and jsonb_typeof(document->'checkIns') = 'array'
    and jsonb_typeof(document->'completedLessons') = 'array'
    and jsonb_typeof(document->'favoriteExercises') = 'array'
    and octet_length(document::text) <= 1000000
  ) is true)
);
alter table public.trainer_hub_workspaces enable row level security;
revoke all on public.trainer_hub_workspaces from public, anon, authenticated;
grant select on public.trainer_hub_workspaces to authenticated;
create policy trainer_hub_read_own on public.trainer_hub_workspaces for select to authenticated
using (owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role in ('coach', 'admin')));

create function public.save_trainer_hub_workspace(p_document jsonb, p_expected_revision bigint, p_mutation_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := auth.uid();
  v_row public.trainer_hub_workspaces;
begin
  if v_owner is null or not exists (select 1 from public.profiles where id = v_owner and role in ('coach', 'admin')) then
    raise exception 'Coach authorization required' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_mutation_id is null or p_document is null then
    raise exception 'Document, revision and mutation identity required' using errcode = '22023';
  end if;
  -- Serialize even a first save so two simultaneous creates cannot overwrite.
  perform 1 from public.profiles where id = v_owner for update;
  select * into v_row from public.trainer_hub_workspaces where owner_id = v_owner for update;
  if found then
    if v_row.last_mutation_id = p_mutation_id then
      if v_row.document <> p_document then raise exception 'Retry document changed' using errcode = '23505'; end if;
      return jsonb_build_object('document', v_row.document, 'revision', v_row.revision);
    end if;
    if v_row.revision <> p_expected_revision then raise exception 'Workspace changed' using errcode = '40001'; end if;
    update public.trainer_hub_workspaces set document = p_document, revision = revision + 1, last_mutation_id = p_mutation_id, updated_at = clock_timestamp()
      where owner_id = v_owner returning * into v_row;
  else
    if p_expected_revision <> 0 then raise exception 'Workspace changed' using errcode = '40001'; end if;
    insert into public.trainer_hub_workspaces(owner_id, document, revision, last_mutation_id) values(v_owner, p_document, 1, p_mutation_id) returning * into v_row;
  end if;
  return jsonb_build_object('document', v_row.document, 'revision', v_row.revision);
end;
$$;
revoke all on function public.save_trainer_hub_workspace(jsonb, bigint, uuid) from public, anon;
grant execute on function public.save_trainer_hub_workspace(jsonb, bigint, uuid) to authenticated;
