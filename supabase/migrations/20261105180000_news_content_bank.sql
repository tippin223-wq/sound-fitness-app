-- Add news without changing existing drafts or published content.
alter table public.app_content_drafts drop constraint if exists app_content_drafts_bank_check;
alter table public.app_content_drafts add constraint app_content_drafts_bank_check check (bank in ('news','chyron','challenges','rewards','avatar','themes','plans','exercises','nutrition','education'));
create or replace function public.validate_published_news() returns trigger language plpgsql set search_path=public as $$
begin
 if new.bank <> 'news' then return new; end if;
 if coalesce(new.fields->>'Kind','') not in ('event','world') then raise exception 'Kind must be event or world'; end if;
 if coalesce(new.fields->>'Topic','') not in ('community','gear','nutrition','recovery','training') then raise exception 'Choose a supported news topic'; end if;
 if coalesce(new.fields->>'Image URL','') !~ '^(https://|/[^/])' then raise exception 'A photo URL is required'; end if;
 if coalesce(new.fields->>'Published at','')='' then raise exception 'A publication date is required'; end if;
 perform (new.fields->>'Published at')::timestamptz;
 if new.fields->>'Kind'='event' then
  if coalesce(trim(new.fields->>'Location'),'')='' or coalesce(new.fields->>'Starts at','')='' then raise exception 'An event needs a start date and location'; end if;
  perform (new.fields->>'Starts at')::timestamptz;
 end if;
 return new;
end $$;
create trigger validate_news_publication before insert or update on public.app_content_publications for each row execute function public.validate_published_news();
