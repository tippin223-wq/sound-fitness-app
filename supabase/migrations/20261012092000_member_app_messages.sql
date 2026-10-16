-- The website continues reading the same member_messages rows. Members cannot impersonate coaches.
alter table public.member_messages add column app_request_id uuid;
create unique index member_messages_app_request_unique on public.member_messages(member_id, app_request_id) where app_request_id is not null;

create or replace function public.send_app_member_message(message_body text, request_id uuid, expected_member_id uuid default null)
returns setof public.member_messages language plpgsql security definer set search_path = public as $$
declare member uuid := auth.uid(); existing public.member_messages;
begin
  if expected_member_id is not null and expected_member_id is distinct from member then raise exception 'Message account changed' using errcode = '42501'; end if;
  if member is null or not exists (select 1 from public.profiles where id = member and role = 'member') then raise exception 'Member authentication required'; end if;
  if request_id is null or length(btrim(message_body)) not between 1 and 2000 then raise exception 'Message must contain 1 to 2000 characters'; end if;
  perform pg_advisory_xact_lock(hashtextextended(member::text, 0));
  select * into existing from public.member_messages where member_id = member and app_request_id = request_id;
  if found then
    if existing.body is distinct from btrim(message_body) then raise exception 'Message request already has a different saved body' using errcode = '23505'; end if;
    return next existing; return;
  end if;
  if (select count(*) from public.member_messages where member_id = member and sent_by = 'member' and created_at > now() - interval '1 minute') >= 5 then raise exception 'Please wait a minute before sending another message'; end if;
  return query insert into public.member_messages(member_id, sent_by, body, app_request_id) values (member, 'member', btrim(message_body), request_id) returning *;
end $$;
revoke all on function public.send_app_member_message(text, uuid, uuid) from public, anon;
grant execute on function public.send_app_member_message(text, uuid, uuid) to authenticated;
