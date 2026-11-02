begin;
-- Canonical domain comes from this website's deployment; editors cannot redefine it.
create function cms.navigation_url_available(p_href text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare matched text[]; host text; port text; relative text:=p_href; anchor text; url_path text;
begin
 if p_href is null or length(p_href)>2048 or p_href ~ '[[:space:]\\]' then return false; end if;
 if left(p_href,1)='#' then return p_href='#main'; end if;
 if left(p_href,1)<>'/' then
  matched:=regexp_match(p_href,'^https://([a-z0-9.-]+)(:([0-9]+))?([/?#].*)?$','i');
  if matched is null then return false; end if;
  host:=regexp_replace(lower(matched[1]),'\.$','');port:=matched[3];
  if port is not null then
   if length(port)>5 then return false; end if;
   if port::integer not between 1 and 65535 then return false; end if;
  end if;
  if host<>'safaricrafters.com' and host not like '%.safaricrafters.com' then return true; end if;
  if host not in ('safaricrafters.com','www.safaricrafters.com') or (port is not null and port<>'443') then return false; end if;
  relative:=coalesce(matched[4],'/');
  if left(relative,1)<>'/' then relative:='/'||relative; end if;
 end if;
 if position('#' in relative)>0 then
  anchor:=split_part(relative,'#',2);
  if anchor<>'main' or length(relative)-length(replace(relative,'#',''))<>1 then return false; end if;
 end if;
 url_path:=split_part(split_part(relative,'#',1),'?',1);
 return exists(select 1 from cms.navigation_public_paths where navigation_public_paths.path=url_path);
end $$;
revoke all on function cms.navigation_url_available(text) from public;
create or replace function cms.enforce_navigation_publication_urls()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; node jsonb;
begin
 if new.content_type<>'navigation' or new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 -- Serialize route removal with releases, including absolute owned-domain URLs.
 perform 1 from cms.navigation_public_paths order by path for share;
 for node in select value from jsonb_array_elements(payload->'items') loop
  if node->'target'->>'kind'='url' and not cms.navigation_url_available(node->'target'->>'href') then raise exception 'navigation_url_verification_required'; end if;
 end loop;
 return new;
end $$;
commit;
