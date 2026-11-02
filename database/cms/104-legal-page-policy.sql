begin;
update cms.validation_policy set validator_version='composition-3' where content_type='page';
create function cms.enforce_legal_page_release()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; node jsonb;
begin
 if new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and old.content_type='page' and old.path in ('/legal/privacy','/legal/terms','/legal/cookies') and (new.content_type<>'page' or new.path is distinct from old.path) then raise exception 'legal_page_route_not_ready'; end if;
 if new.content_type<>'page' or new.path not in ('/legal/privacy','/legal/terms','/legal/cookies') then return new; end if;
 if new.locale<>'en' then raise exception 'legal_page_route_not_ready'; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.locale is not distinct from old.locale and new.path is not distinct from old.path and new.content_type is not distinct from old.content_type then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 perform 1 from cms.navigation_public_paths order by path for share;
 for node in select value from jsonb_path_query(payload,'$.composition.sections[*].data.body[*]') as blocks(value) where value->>'kind'='link' loop
  if jsonb_typeof(node->'href') is distinct from 'string' then raise exception 'legal_page_link_unavailable'; end if;
  -- Local anchors and their visibility intervals are checked by the trusted validator.
  if left(node->>'href',1)<>'#' and not cms.navigation_url_available(node->>'href') then raise exception 'legal_page_link_unavailable'; end if;
 end loop;
 return new;
end $$;
create trigger cms_legal_page_release before insert or update of published_revision_id,path,locale,content_type on cms.records for each row execute function cms.enforce_legal_page_release();
revoke all on function cms.enforce_legal_page_release() from public;
commit;
