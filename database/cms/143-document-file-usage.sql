begin;
-- Saved references count even when a download section is currently hidden.
create function cms.document_payload_uses_file(p_site uuid,p_type text,p_payload jsonb,p_asset uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((p_type='document' and p_payload #>> '{file,assetId}'=p_asset::text),false)
 or exists(select 1 from jsonb_path_query(p_payload,'$.sections[*] ? (@.kind == "downloads").data.items[*]') item
  join cms.revisions v on v.website_id=p_site and v.id::text=item->>'versionId' and v.record_id::text=item #>> '{document,recordId}'
  join cms.records r on r.website_id=v.website_id and r.id=v.record_id and r.content_type='document'
  where v.payload #>> '{file,assetId}'=p_asset::text);
$$;
create function cms.document_file_usage(p_site uuid,p_asset uuid,p_after uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('recordId',q.id,'title',q.internal_title,'type',q.content_type,'path',q.path,
  'draft',q.draft,'published',q.published,'historical',q.historical) order by q.id),'[]') from (
  select r.id,r.internal_title,r.content_type,r.path,
   coalesce(bool_or(v.id=r.current_revision_id),false) draft,
   coalesce(bool_or(v.id=r.published_revision_id),false) published,
   coalesce(bool_or(v.id is distinct from r.current_revision_id and v.id is distinct from r.published_revision_id),false) historical
  from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id
  where r.website_id=p_site and (p_after is null or r.id>p_after)
   and exists(select 1 from cms.document_files f where f.website_id=p_site and f.id=p_asset)
   and cms.can(p_site,'view','document') and cms.can(p_site,'view',r.content_type,r.id)
   and cms.document_payload_uses_file(p_site,r.content_type,v.payload,p_asset)
  group by r.id,r.internal_title,r.content_type,r.path,r.current_revision_id,r.published_revision_id
  order by r.id limit 50
 ) q;
$$;
revoke all on function cms.document_payload_uses_file(uuid,text,jsonb,uuid),cms.document_file_usage(uuid,uuid,uuid) from public;
grant execute on function cms.document_file_usage(uuid,uuid,uuid) to authenticated;
commit;
