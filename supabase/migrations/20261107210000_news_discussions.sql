-- Account-owned reactions and shared member comments. No anonymous reads/writes.
create table if not exists public.news_discussion_articles (
 article_id text primary key check (length(article_id) between 1 and 200)
);
alter table public.news_discussion_articles enable row level security;
insert into public.news_discussion_articles(article_id) select jsonb_array_elements_text($ids$["weekly-2026-11-07-training","weekly-2026-11-07-nutrition","weekly-2026-11-07-recovery","editorial-2026-11-07-training-short-sessions","editorial-2026-11-07-training-strength-days","editorial-2026-11-07-training-whole-body","editorial-2026-11-07-training-aerobic-mix","editorial-2026-11-07-training-gradual-start","editorial-2026-11-07-training-bands","editorial-2026-11-07-training-specific-goal","editorial-2026-11-07-training-movement-break","editorial-2026-11-07-training-progression","editorial-2026-11-07-nutrition-protein-variety","editorial-2026-11-07-nutrition-freezer","editorial-2026-11-07-nutrition-whole-grains","editorial-2026-11-07-nutrition-menu","editorial-2026-11-07-nutrition-color","editorial-2026-11-07-nutrition-breakfast","editorial-2026-11-07-nutrition-herbs","editorial-2026-11-07-nutrition-vegetables","editorial-2026-11-07-nutrition-repeatable","editorial-2026-11-07-recovery-wind-down","editorial-2026-11-07-recovery-weekends","editorial-2026-11-07-recovery-caffeine","editorial-2026-11-07-recovery-bedroom","editorial-2026-11-07-recovery-naps","editorial-2026-11-07-recovery-quality","editorial-2026-11-07-recovery-diary","editorial-2026-11-07-recovery-screens","editorial-2026-11-07-recovery-persistent","editorial-2026-11-07-gear-watch-fit","editorial-2026-11-07-gear-workout-mode","editorial-2026-11-07-gear-profile","editorial-2026-11-07-gear-calibration","editorial-2026-11-07-gear-wrist-detection","editorial-2026-11-07-gear-cold","editorial-2026-11-07-gear-motion","editorial-2026-11-07-gear-chest-strap","editorial-2026-11-07-gear-wellness","editorial-2026-11-07-gear-claims","editorial-2026-11-07-sports-tennis","editorial-2026-11-07-sports-swimming","editorial-2026-11-07-sports-cycling","editorial-2026-11-07-sports-talk-test","editorial-2026-11-07-sports-relative-effort","editorial-2026-11-07-sports-return","editorial-2026-11-07-sports-enjoyment","editorial-2026-11-07-sports-beyond-score","editorial-2026-11-07-sports-strength-support","editorial-2026-11-07-sports-everyday","editorial-2026-11-07-community-walking-friend","editorial-2026-11-07-community-calendar-buddy","editorial-2026-11-07-community-ask-support","editorial-2026-11-07-community-group","editorial-2026-11-07-community-walking-meeting","editorial-2026-11-07-community-shared-progress","editorial-2026-11-07-community-weather","editorial-2026-11-07-community-inclusive","editorial-2026-11-07-community-milestone","editorial-2026-11-07-community-restart"]$ids$::jsonb) on conflict do nothing;

insert into public.news_discussion_articles(article_id)
select source_key from public.app_content_publications where bank='news'
on conflict do nothing;
create or replace function public.register_news_discussion_article() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.bank='news' then
  insert into public.news_discussion_articles(article_id) values(new.source_key) on conflict do nothing;
 end if;
 return new;
end $$;
create trigger register_news_discussion after insert or update on public.app_content_publications
for each row execute function public.register_news_discussion_article();

create table public.member_news_reactions (
 article_id text references public.news_discussion_articles(article_id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 reaction smallint not null check (reaction in (-1,1)),
 primary key(article_id,user_id)
);
create table public.member_news_article_comments (
 id uuid primary key default gen_random_uuid(),
 article_id text not null references public.news_discussion_articles(article_id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 body text not null check (length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default clock_timestamp()
);
create index member_news_comments_article_time on public.member_news_article_comments(article_id,created_at desc);
create index member_news_comments_author_time on public.member_news_article_comments(user_id,created_at desc);
alter table public.member_news_reactions enable row level security;
alter table public.member_news_article_comments enable row level security;
revoke all on public.news_discussion_articles,public.member_news_reactions,public.member_news_article_comments from anon,authenticated;

create or replace function public.member_news_feedback(p_article_ids text[])
returns table(article_id text,likes bigint,dislikes bigint,comments bigint,reaction smallint)
language sql stable security definer set search_path=public,pg_temp as $$
 select a.article_id,
  (select count(*) from member_news_reactions r where r.article_id=a.article_id and r.reaction=1),
  (select count(*) from member_news_reactions r where r.article_id=a.article_id and r.reaction=-1),
  (select count(*) from member_news_article_comments c where c.article_id=a.article_id),
  coalesce((select r.reaction from member_news_reactions r where r.article_id=a.article_id and r.user_id=auth.uid()),0)::smallint
 from news_discussion_articles a
 where auth.uid() is not null and a.article_id=any(p_article_ids[1:100]);
$$;

create or replace function public.set_member_news_reaction(p_article_id text,p_reaction smallint)
returns table(article_id text,likes bigint,dislikes bigint,comments bigint,reaction smallint)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Sign in to react'; end if;
 if p_reaction is null or p_reaction not in (-1,0,1) then raise exception 'Invalid reaction'; end if;
 if not exists(select 1 from news_discussion_articles a where a.article_id=p_article_id) then raise exception 'Article not found'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text),hashtext(p_article_id));
 if p_reaction=0 then delete from member_news_reactions r where r.user_id=auth.uid() and r.article_id=p_article_id;
 else insert into member_news_reactions as r(article_id,user_id,reaction) values(p_article_id,auth.uid(),p_reaction)
 on conflict on constraint member_news_reactions_pkey do update set reaction=excluded.reaction;
 end if;
 return query select * from member_news_feedback(array[p_article_id]);
end $$;

create or replace function public.member_news_comments(p_article_id text)
returns table(id uuid,body text,created_at timestamptz,is_own boolean)
language sql stable security definer set search_path=public,pg_temp as $$
 select c.id,c.body,c.created_at,c.user_id=auth.uid()
 from member_news_article_comments c
 where auth.uid() is not null and c.article_id=p_article_id
 order by c.created_at desc,c.id desc limit 50;
$$;

create or replace function public.add_member_news_comment(p_article_id text,p_body text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to comment'; end if;
 if p_body is null or length(btrim(p_body)) not between 1 and 2000 then raise exception 'Write between 1 and 2000 characters'; end if;
 if not exists(select 1 from news_discussion_articles where article_id=p_article_id) then raise exception 'Article not found'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text),hashtext('news-comments'));
 if (select count(*) from member_news_article_comments where user_id=auth.uid() and created_at>clock_timestamp()-interval '1 minute')>=5 then raise exception 'Please wait before adding another comment'; end if;
 insert into member_news_article_comments(article_id,user_id,body) values(p_article_id,auth.uid(),btrim(p_body)) returning id into new_id;
 return new_id;
end $$;

create or replace function public.delete_member_news_comment(p_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Sign in to remove your comment'; end if;
 delete from member_news_article_comments where id=p_id and user_id=auth.uid();
 return found;
end $$;

revoke all on function public.register_news_discussion_article() from public;
revoke all on function public.member_news_feedback(text[]),public.set_member_news_reaction(text,smallint),public.member_news_comments(text),public.add_member_news_comment(text,text),public.delete_member_news_comment(uuid) from public;
grant execute on function public.member_news_feedback(text[]),public.set_member_news_reaction(text,smallint),public.member_news_comments(text),public.add_member_news_comment(text,text),public.delete_member_news_comment(uuid) to authenticated;
