begin;
create function cms.journey_media_available(p_site uuid,p_payload jsonb)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if not (p_payload ? 'media') then return true; end if;
 if jsonb_typeof(p_payload->'media') is distinct from 'array' then return false; end if;
 return not exists(
  select 1 from jsonb_array_elements(p_payload->'media') item
  left join cms.media_objects m on m.website_id=p_site and m.id=item->>'assetId'
  where jsonb_typeof(item->'assetId') is distinct from 'string' or m.id is null
   or m.inspection_status<>'ready' or m.rights_status<>'approved' or m.archived_at is not null
   or (m.rights_expires_at is not null and m.rights_expires_at<=now())
 );
end $$;

-- Public CMS reads fail closed immediately, even before the delivery worker runs.
create or replace function cms.get_public_page(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('recordId',r.id,'revisionId',v.id,'type',r.content_type,'payload',v.payload)
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
 where r.website_id=p_site and r.path=p_path and r.locale=p_locale
 and (r.content_type<>'journey' or cms.journey_media_available(p_site,v.payload));
$$;

create function cms.withdraw_unavailable_media(p_site uuid,p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec cms.records; job uuid; result jsonb:='[]'; payload jsonb;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_batch_size'; end if;
 for rec in select r.* from cms.records r join cms.revisions v on v.id=r.published_revision_id and v.website_id=r.website_id and v.record_id=r.id
  where r.website_id=p_site and r.content_type='journey' and not cms.journey_media_available(p_site,v.payload)
  order by r.id for update of r skip locked limit p_limit loop
  -- Recheck after claiming the record; a rights correction may have raced discovery.
  select v.payload into payload from cms.revisions v where v.id=rec.published_revision_id;
  if cms.journey_media_available(p_site,payload) then continue; end if;
  update cms.records set published_revision_id=null,updated_at=now() where id=rec.id;
  insert into cms.delivery_jobs(website_id,record_id,revision_id,operation) values(p_site,rec.id,rec.published_revision_id,'unpublish') returning id into job;
  insert into cms.audit_events(website_id,action,record_id,revision_id,details)
   values(p_site,'publication.withdrawn_media',rec.id,rec.published_revision_id,jsonb_build_object('deliveryJobId',job,'reason','media_unavailable'));
  result:=result||jsonb_build_array(jsonb_build_object('recordId',rec.id,'revisionId',rec.published_revision_id,'deliveryJobId',job));
 end loop;
 return result;
end $$;
revoke all on function cms.journey_media_available(uuid,jsonb),cms.withdraw_unavailable_media(uuid,integer) from public;
grant execute on function cms.withdraw_unavailable_media(uuid,integer) to service_role;
commit;
