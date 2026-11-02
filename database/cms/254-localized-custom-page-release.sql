begin;
-- Lock and recheck exact-language destinations at the publication transaction boundary.
create function cms.assert_localized_page_links(p_site uuid,p_record uuid,p_locale text,p_path text,p_payload jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare href text; target_path text; target uuid; roots uuid[]:='{}'; paths text[]:='{}';
begin
 if p_locale is null or p_locale='en' or p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then raise exception 'custom_page_route_not_ready'; end if;
 for href in select distinct value#>>'{}' from jsonb_path_query(p_payload,'$.composition.sections[*].data.**.href') value order by 1 loop
  if href is null or length(href)>2048 or href ~ '[[:space:]\\]' then raise exception 'custom_page_link_unavailable'; end if;
  if left(href,1)='#' then continue; end if; -- Exact anchor/schedule checks belong to the trusted receipt.
  if href ~ '^mailto:[A-Za-z0-9.!#$&''*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' and href !~ '[?%,[:space:]\\]' then continue; end if;
  target_path:=cms.localized_publication_link_path(href);
  if target_path is null then
   if not cms.navigation_url_available(href) then raise exception 'custom_page_link_unavailable'; end if;
   continue;
  end if;
  if not cms.is_custom_page_path(target_path) then raise exception 'custom_page_link_unavailable'; end if;
  if target_path=p_path then continue; end if;
  if not target_path=any(paths) then paths:=array_append(paths,target_path);end if;
 end loop;
 if cardinality(paths)>1000 then raise exception 'custom_page_link_unavailable';end if;
 -- Find the exact language first; no source-language substitution is possible.
 for target_path in select value from unnest(paths) value order by value loop
  select r.id into target from cms.records r where r.website_id=p_site and r.locale=p_locale and r.path=target_path and r.content_type='page';
  if not found then raise exception 'custom_page_link_unavailable'; end if;
  roots:=array_append(roots,target);
 end loop;
 -- Existing graph helper locks records and approved image rights in deterministic UUID order.
 begin
  perform cms.lock_settings_dependencies(p_site,roots,p_locale,p_record);
 exception when raise_exception then raise exception 'custom_page_link_unavailable';
 end;
 for target_path in select value from unnest(paths) value order by value loop
  if cms.get_public_page(p_site,target_path,p_locale) is null then raise exception 'custom_page_link_unavailable';end if;
 end loop;
end $$;
revoke all on function cms.assert_localized_page_links(uuid,uuid,text,text,jsonb) from public;
-- Enable exact-language custom editorial pages; retain URL-proposal and specialized-route guards.
create or replace function cms.enforce_custom_page_release()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; node jsonb;
begin
 if new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and old.content_type='page' and cms.is_custom_page_path(old.path) and old.published_revision_id is not null and (new.content_type is distinct from old.content_type or new.path is distinct from old.path or new.locale is distinct from old.locale) and not exists(select 1 from cms.page_url_applications a join cms.page_url_proposals p on p.id=a.proposal_id
  where a.transaction_id=txid_current() and a.website_id=new.website_id and a.record_id=new.id
   and p.old_path=old.path and p.new_path=new.path and p.status='approved'
   and new.locale=old.locale and new.content_type=old.content_type and new.published_revision_id=old.published_revision_id
   and new.current_revision_id=p.revision_id)
 then raise exception 'custom_page_route_not_ready'; end if;
 if new.content_type<>'page' or new.path in ('/destinations/kenya','/mice','/private-aviation','/guided-bespoke-safaris','/concept','/contact','/conservation-commitment','/about','/specialists','/photo-expeditions','/legal/privacy','/legal/terms','/legal/cookies') then return new; end if;
 if not cms.is_custom_page_path(new.path) or new.locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then raise exception 'custom_page_route_not_ready'; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.locale is not distinct from old.locale and new.path is not distinct from old.path and new.content_type is not distinct from old.content_type then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if new.locale<>'en' then
  perform cms.assert_localized_page_links(new.website_id,new.id,new.locale,new.path,payload);
  return new;
 end if;
 perform 1 from cms.navigation_public_paths order by path for share;
 for node in select value from jsonb_path_query(payload,'$.composition.sections[*].data.**.href') as links(value) loop
  if jsonb_typeof(node) is distinct from 'string' then raise exception 'custom_page_link_unavailable'; end if;
  -- Local anchors and their visibility intervals are checked by the trusted validator.
  if (node #>> '{}') ~ '^mailto:[A-Za-z0-9.!#$&''*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' and (node #>> '{}') !~ '[?%,[:space:]\\]' then continue; end if;
  if left((node #>> '{}'),1)<>'#' and not cms.navigation_url_available((node #>> '{}')) then raise exception 'custom_page_link_unavailable'; end if;
 end loop;
 return new;
end $$;
commit;
