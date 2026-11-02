begin;
-- Tanzania dependencies and delivery are connected; preserve all localized URL guards.
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
 if new.content_type<>'page' or new.path in ('/destinations/tanzania','/destinations/kenya','/mice','/private-aviation','/guided-bespoke-safaris','/concept','/contact','/conservation-commitment','/about','/specialists','/photo-expeditions','/legal/privacy','/legal/terms','/legal/cookies') then return new; end if;
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
