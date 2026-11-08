-- Retain stored gear/recovery identifiers while exposing clearer editorial labels.
create or replace function public.validate_published_news() returns trigger
language plpgsql set search_path=public as $$
begin
 if new.bank <> 'news' then return new; end if;
 if coalesce(new.fields->>'Kind','') not in ('event','world') then raise exception 'Kind must be event or world'; end if;
 if coalesce(new.fields->>'Topic','') not in ('community','gear','sports','nutrition','recovery','training') then raise exception 'Choose a supported news topic'; end if;
 if coalesce(new.fields->>'Image URL','') !~ '^(https://|/[^/])' then raise exception 'A photo URL is required'; end if;
 if coalesce(new.fields->>'Published at','')='' then raise exception 'A publication date is required'; end if;
 perform (new.fields->>'Published at')::timestamptz;
 if new.fields->>'Kind'='event' then
  if coalesce(trim(new.fields->>'Location'),'')='' or coalesce(new.fields->>'Starts at','')='' then raise exception 'An event needs a start date and location'; end if;
  perform (new.fields->>'Starts at')::timestamptz;
 end if;
 return new;
end $$;
