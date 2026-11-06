-- Shared authoring banks. Runtime publication is deliberately a separate integration.
create table if not exists public.app_content_drafts (
 id uuid primary key default gen_random_uuid(),
 bank text not null check (bank in ('chyron','challenges','rewards','avatar','themes','plans','exercises','nutrition','education')),
 title text not null check (length(trim(title)) between 1 and 160),
 summary text not null default '' check (length(summary) <= 2000),
 fields jsonb not null default '{}' check (jsonb_typeof(fields) = 'object' and octet_length(fields::text) <= 50000),
 revision integer not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.app_content_drafts enable row level security;
create policy app_content_admin_read on public.app_content_drafts for select to authenticated using (
 exists(select 1 from public.profiles where id=auth.uid() and role='admin')
);
grant select on public.app_content_drafts to authenticated;
revoke insert,update,delete on public.app_content_drafts from anon,authenticated;
create or replace function public.save_app_content_draft(p_id uuid,p_bank text,p_title text,p_summary text,p_fields jsonb,p_revision integer)
returns public.app_content_drafts language plpgsql security definer set search_path=public as $$
declare result public.app_content_drafts;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin access required'; end if;
 if exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified') and coalesce(auth.jwt()->>'aal','') <> 'aal2' then raise exception 'Complete account verification'; end if;
 if p_id is null then
  insert into public.app_content_drafts(bank,title,summary,fields) values(p_bank,trim(p_title),p_summary,p_fields) returning * into result;
 else
  update public.app_content_drafts set title=trim(p_title),summary=p_summary,fields=p_fields,revision=revision+1,updated_at=now()
   where id=p_id and bank=p_bank and revision=p_revision returning * into result;
  if not found then raise exception 'This draft changed. Reload before saving.'; end if;
 end if;
 return result;
end $$;
revoke all on function public.save_app_content_draft(uuid,text,text,text,jsonb,integer) from public,anon;
grant execute on function public.save_app_content_draft(uuid,text,text,text,jsonb,integer) to authenticated;
