begin;
-- Cover image references inside all composed sections, including hidden sections.
create function cms.record_media_available(p_site uuid,p_type text,p_payload jsonb)
returns boolean language sql stable security definer set search_path='' as $$
 select (p_type<>'journey' or cms.journey_media_available(p_site,p_payload)) and not exists(
  select 1 from jsonb_path_query(p_payload,'$.**.assetId') value
  left join cms.media_objects m on m.website_id=p_site and m.id=value #>> '{}'
  where jsonb_typeof(value)<>'string' or m.id is null or m.inspection_status<>'ready'
   or m.rights_status<>'approved' or m.archived_at is not null
   or (m.rights_expires_at is not null and m.rights_expires_at<=now())
 );
$$;

create or replace function cms.get_record_media_status(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; result jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found then return null; end if;
 if current_setting('role',true)<>'service_role' and not cms.can(p_site,'view',rec.content_type,rec.id) then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if not found then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',refs.id,'available',coalesce(
  m.inspection_status='ready' and m.rights_status='approved' and m.archived_at is null
  and (m.rights_expires_at is null or m.rights_expires_at>now()),false)) order by refs.id),'[]') into result
 from (select distinct value #>> '{}' id from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string') refs
 left join cms.media_objects m on m.website_id=p_site and m.id=refs.id;
 return result;
end $$;

create or replace function cms.enforce_published_media()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; asset text; media cms.media_objects;
begin
 if new.published_revision_id is null or new.published_revision_id is not distinct from old.published_revision_id then return new; end if;
 select v.payload into payload from cms.revisions v where v.id=new.published_revision_id and v.website_id=new.website_id and v.record_id=new.id;
 if new.content_type='journey' and payload ? 'media' and jsonb_typeof(payload->'media') is distinct from 'array' then raise exception 'media_verification_required'; end if;
 if exists(select 1 from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)<>'string') then raise exception 'media_verification_required'; end if;
 for asset in select distinct value #>> '{}' from jsonb_path_query(payload,'$.**.assetId') value order by 1 loop
  select * into media from cms.media_objects where website_id=new.website_id and id=asset for share;
  if not found or media.inspection_status<>'ready' or media.rights_status<>'approved' or media.archived_at is not null
   or (media.rights_expires_at is not null and media.rights_expires_at<=now()) then raise exception 'media_verification_required'; end if;
 end loop;
 -- Retain the journey contract's handling of malformed entries without asset IDs.
 if new.content_type='journey' and not cms.journey_media_available(new.website_id,payload) then raise exception 'media_verification_required'; end if;

 return new;
end $$;
create or replace function cms.get_public_page(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('recordId',r.id,'revisionId',v.id,'type',r.content_type,'payload',v.payload)
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
 where r.website_id=p_site and r.path=p_path and r.locale=p_locale
 and cms.record_media_available(p_site,r.content_type,v.payload);
$$;

create or replace function cms.withdraw_unavailable_media(p_site uuid,p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec cms.records; job uuid; result jsonb:='[]'; payload jsonb;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_batch_size'; end if;
 for rec in select r.* from cms.records r join cms.revisions v on v.id=r.published_revision_id and v.website_id=r.website_id and v.record_id=r.id
  where r.website_id=p_site and not cms.record_media_available(p_site,r.content_type,v.payload)
  order by r.id for update of r skip locked limit p_limit loop
  -- Recheck after claiming the record; a rights correction may have raced discovery.
  select v.payload into payload from cms.revisions v where v.id=rec.published_revision_id;
  if cms.record_media_available(p_site,rec.content_type,payload) then continue; end if;
  update cms.records set published_revision_id=null,updated_at=now() where id=rec.id;
  insert into cms.delivery_jobs(website_id,record_id,revision_id,operation) values(p_site,rec.id,rec.published_revision_id,'unpublish') returning id into job;
  insert into cms.audit_events(website_id,action,record_id,revision_id,details)
   values(p_site,'publication.withdrawn_media',rec.id,rec.published_revision_id,jsonb_build_object('deliveryJobId',job,'reason','media_unavailable'));
  result:=result||jsonb_build_array(jsonb_build_object('recordId',rec.id,'revisionId',rec.published_revision_id,'deliveryJobId',job));
 end loop;
 return result;
end $$;
revoke all on function cms.record_media_available(uuid,text,jsonb) from public;
commit;
