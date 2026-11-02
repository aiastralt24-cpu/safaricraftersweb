begin;
-- Deployment-owned paths; CMS editors cannot add administrative or arbitrary routes.
create table cms.navigation_public_paths(path text primary key check(path ~ '^/([a-z0-9-]+/)*[a-z0-9-]*$'));
insert into cms.navigation_public_paths(path) values
('/'),('/about'),('/concept'),('/conservation-commitment'),('/contact'),('/destinations'),
('/guided-bespoke-safaris'),('/journal'),('/journeys'),('/legal/cookies'),('/legal/privacy'),('/legal/terms'),
('/mice'),('/photo-expeditions'),('/plan'),('/private-aviation'),('/reviews'),('/search'),('/specialists'),
('/store'),('/store/books'),('/store/books/ghosts-of-the-granite-hills');
alter table cms.navigation_public_paths enable row level security;
revoke all on cms.navigation_public_paths from public,anon,authenticated;
create function cms.enforce_navigation_publication_urls()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; node jsonb; href text;
begin
 if new.content_type<>'navigation' or new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 for node in select value from jsonb_array_elements(payload->'items') loop
  if node->'target'->>'kind'<>'url' then continue; end if;
  href:=node->'target'->>'href';
  if href is null or href ~ '[[:space:]\\]' then raise exception 'navigation_url_verification_required'; end if;
  if left(href,1)='/' then
   if position('#' in href)>0 then raise exception 'navigation_url_verification_required'; end if;
   -- SHARE also prevents deployment removal while this release is committing.
   perform 1 from cms.navigation_public_paths where path=split_part(href,'?',1) for share;
   if not found then raise exception 'navigation_url_verification_required'; end if;
  elsif href !~ '^https://[^/@?#:]+(:[0-9]+)?([/?#]|$)' then raise exception 'navigation_url_verification_required';
  end if;
 end loop;
 return new;
end $$;
create trigger cms_navigation_url_check before insert or update of published_revision_id on cms.records for each row execute function cms.enforce_navigation_publication_urls();
revoke all on function cms.enforce_navigation_publication_urls() from public;
-- Complete URL syntax validation still belongs to the trusted schema validator.
commit;
