begin;
alter table public.app_content_drafts add column if not exists source_key text;
create unique index if not exists app_content_source_key on public.app_content_drafts(bank,source_key) where source_key is not null;
alter table public.app_content_drafts drop constraint if exists app_content_drafts_fields_check;
alter table public.app_content_drafts add constraint app_content_drafts_fields_check check(jsonb_typeof(fields)='object' and octet_length(fields::text)<=500000);

create table public.app_content_publications (
 id uuid primary key references public.app_content_drafts(id), bank text not null,
 source_key text not null, title text not null, summary text not null,
 fields jsonb not null, revision integer not null, published_at timestamptz not null default now(),
 unique(bank,source_key)
);
create table public.app_content_history (
 id bigint generated always as identity primary key, entry_id uuid not null,
 revision integer not null, snapshot jsonb not null, published_by uuid, published_at timestamptz not null default now(),
 unique(entry_id,revision)
);
alter table public.app_content_publications enable row level security;
alter table public.app_content_history enable row level security;
create policy content_public_read on public.app_content_publications for select to anon,authenticated using(true);
create policy content_history_admin_read on public.app_content_history for select to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
grant select on public.app_content_publications to anon,authenticated;
grant select on public.app_content_history to authenticated;
revoke insert,update,delete on public.app_content_publications,public.app_content_history from anon,authenticated;

create function public.publish_app_content(p_id uuid,p_revision integer) returns public.app_content_publications
language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.app_content_drafts; result public.app_content_publications; pair record; program jsonb; next_version integer;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required'; end if;
 if exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified') and coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'Complete account verification'; end if;
 select * into d from public.app_content_drafts where id=p_id for update;
 if not found or d.revision<>p_revision then raise exception 'This draft changed. Reload before publishing.'; end if;
 if length(trim(d.title))=0 then raise exception 'A title is required'; end if;
 for pair in select * from jsonb_each(d.fields) loop
  if jsonb_typeof(pair.value)<>'string' then raise exception 'Content fields must be text'; end if;
  if pair.key like '%URL' and trim(pair.value#>>'{}')<>'' and (pair.value#>>'{}') !~ '^(https://|/[^/])' then raise exception 'Use HTTPS or a local asset path'; end if;
 end loop;
 if d.bank='chyron' and coalesce(trim(d.fields->>'Message'),'')='' then raise exception 'Enter a message'; end if;
 if d.bank='challenges' then
  if d.source_key is null or d.fields->>'Target' !~ '^[1-9][0-9]{0,5}$' then raise exception 'Choose an existing challenge and a positive target'; end if;
 end if;
 if d.bank='rewards' and d.source_key like 'weekly:%' then
  if d.fields->>'Amount' !~ '^[1-9][0-9]{0,3}$' then raise exception 'Reward amount must be between 1 and 9999'; end if;
 end if;
 if d.bank='themes' then
  if coalesce(d.fields->>'Accent','')<>'' and d.fields->>'Accent' !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Accent must be a six-digit hex color'; end if;
  if coalesce(d.fields->>'Today','')<>'' and d.fields->>'Today' !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Today must be a six-digit hex color'; end if;
 end if;
 if d.bank='avatar' and coalesce(d.fields->>'Sapphire unlock cost','')<>'' and d.fields->>'Sapphire unlock cost' !~ '^[0-9]{1,4}$' then raise exception 'Unlock cost must be between 0 and 9999'; end if;
 -- Imported program definitions are published as NEW immutable review versions.
 -- Existing enrollments retain their original activities, rewards and evidence.
 if d.bank='plans' then
  program:=(d.fields->>'Program JSON')::jsonb;
  if program->>'id' is null or jsonb_typeof(program->'activities')<>'array' then raise exception 'A complete program definition is required'; end if;
  perform pg_advisory_xact_lock(hashtext(program->>'id'));
  select coalesce(max(version),0)+1 into next_version from public.fitness_program_versions where program_id=program->>'id';
  if not exists(select 1 from public.app_content_history where entry_id=d.id and revision=d.revision) then
   program:=program||jsonb_build_object('title',d.title,'goal',coalesce(d.fields->>'Goal',d.summary),'version',next_version,'status','review');
   insert into public.fitness_program_versions(program_id,version,definition) values(program->>'id',next_version,program);
  end if;
 end if;
 insert into public.app_content_publications(id,bank,source_key,title,summary,fields,revision)
 values(d.id,d.bank,coalesce(d.source_key,'custom:'||d.id::text),d.title,d.summary,d.fields,d.revision)
 on conflict(id) do update set title=excluded.title,summary=excluded.summary,fields=excluded.fields,revision=excluded.revision,published_at=now()
 returning * into result;
 insert into public.app_content_history(entry_id,revision,snapshot,published_by) values(d.id,d.revision,to_jsonb(result),auth.uid()) on conflict do nothing;
 return result;
end $$;
revoke all on function public.publish_app_content(uuid,integer) from public,anon;
grant execute on function public.publish_app_content(uuid,integer) to authenticated;
create function public.app_content_bank_counts() returns table(bank text,drafts bigint,published bigint)
language sql security invoker set search_path=public as $$
 select d.bank,count(*),count(p.id) from app_content_drafts d left join app_content_publications p using(id) group by d.bank
$$;
grant execute on function public.app_content_bank_counts() to authenticated;
revoke execute on function public.app_content_bank_counts() from public,anon;
commit;
