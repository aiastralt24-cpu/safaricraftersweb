begin;
-- Route-aware overloads preserve legacy callers' conservative page policy.
create function cms.record_videos_available(p_site uuid,p_type text,p_path text,p_locale text,p_payload jsonb)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.record_videos_available(p_site,case when p_type='page' and p_path='/concept' and p_locale='en' then 'homepage' else p_type end,p_payload);
$$;
create function cms.record_media_available(p_site uuid,p_type text,p_path text,p_locale text,p_payload jsonb)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.record_media_available(p_site,case when p_type='page' and p_path='/concept' and p_locale='en' then 'homepage' else p_type end,p_payload);
$$;
revoke all on function cms.record_videos_available(uuid,text,text,text,jsonb),cms.record_media_available(uuid,text,text,text,jsonb) from public;
create or replace function cms.enforce_published_videos()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; asset text;
begin
 if new.published_revision_id is null or new.published_revision_id is not distinct from old.published_revision_id then return new; end if;
 select v.payload into payload from cms.revisions v where v.id=new.published_revision_id and v.website_id=new.website_id and v.record_id=new.id;
 for asset in select distinct value #>> '{}' from (
  select value from jsonb_path_query(payload,'$.**.desktopAssetId') value
  union all select value from jsonb_path_query(payload,'$.**.mobileAssetId') value
 ) refs where jsonb_typeof(value)='string' order by 1 loop
  -- Match upload completion's upload-before-media lock order.
  perform 1 from cms.uploads where website_id=new.website_id and id::text=asset for share;
  perform 1 from cms.media_objects where website_id=new.website_id and id=asset for share;
 end loop;
 if not cms.record_videos_available(new.website_id,new.content_type,new.path,new.locale,payload) then raise exception 'media_verification_required'; end if;
 return new;
end $$;
create or replace function cms.withdraw_unavailable_media(p_site uuid,p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec cms.records; job uuid; result jsonb:='[]'; payload jsonb;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_batch_size'; end if;
 for rec in select r.* from cms.records r join cms.revisions v on v.id=r.published_revision_id and v.website_id=r.website_id and v.record_id=r.id
  where r.website_id=p_site and not cms.record_media_available(p_site,r.content_type,r.path,r.locale,v.payload)
  order by r.id for update of r skip locked limit p_limit loop
  -- Recheck after claiming the record; a rights correction may have raced discovery.
  select v.payload into payload from cms.revisions v where v.id=rec.published_revision_id;
  if cms.record_media_available(p_site,rec.content_type,rec.path,rec.locale,payload) then continue; end if;
  update cms.records set published_revision_id=null,updated_at=now() where id=rec.id;
  insert into cms.delivery_jobs(website_id,record_id,revision_id,operation) values(p_site,rec.id,rec.published_revision_id,'unpublish') returning id into job;
  insert into cms.audit_events(website_id,action,record_id,revision_id,details)
   values(p_site,'publication.withdrawn_media',rec.id,rec.published_revision_id,jsonb_build_object('deliveryJobId',job,'reason','media_unavailable'));
  result:=result||jsonb_build_array(jsonb_build_object('recordId',rec.id,'revisionId',rec.published_revision_id,'deliveryJobId',job));
 end loop;
 return result;
end $$;
commit;
