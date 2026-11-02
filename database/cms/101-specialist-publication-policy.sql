begin;
create function cms.enforce_specialist_publication_references()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; target uuid; related cms.records; dependency jsonb; asset text; media cms.media_objects;
begin
 if new.content_type<>'specialist' or new.published_revision_id is null then return new; end if;
 if new.path is not null or new.locale<>'en' then raise exception 'specialist_route_not_ready'; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.path is not distinct from old.path and new.locale is not distinct from old.locale and new.content_type is not distinct from old.content_type then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if payload is null or jsonb_typeof(payload->'journeys') is distinct from 'array' then raise exception 'specialist_reference_verification_required'; end if;
 if jsonb_array_length(payload->'journeys')>100 then raise exception 'specialist_reference_verification_required'; end if;
 for target in select distinct (v->>'recordId')::uuid from jsonb_array_elements(payload->'journeys') v order by 1 loop
  if target is null or target=new.id then raise exception 'specialist_reference_verification_required'; end if;
  select * into related from cms.records where website_id=new.website_id and id=target for share;
  if not found or related.content_type<>'journey' or related.locale<>new.locale or related.published_revision_id is null then raise exception 'specialist_reference_verification_required'; end if;
  select v.payload into dependency from cms.revisions v where v.website_id=new.website_id and v.record_id=target and v.id=related.published_revision_id;
  for asset in select distinct v #>> '{}' from jsonb_path_query(dependency,'$.**.assetId') v where jsonb_typeof(v)='string' order by 1 loop
   select * into media from cms.media_objects where website_id=new.website_id and id=asset for share;
   if not found or media.inspection_status<>'ready' or media.rights_status<>'approved' or media.archived_at is not null or (media.rights_expires_at is not null and media.rights_expires_at<=now()) then raise exception 'specialist_reference_verification_required'; end if;
  end loop;
  if related.path is null or cms.get_public_page(new.website_id,related.path,new.locale) is null then raise exception 'specialist_reference_verification_required'; end if;
 end loop;
 return new;
exception when invalid_text_representation then raise exception 'specialist_reference_verification_required';
end $$;
create trigger cms_specialist_reference_check before insert or update of published_revision_id,path,locale,content_type on cms.records for each row execute function cms.enforce_specialist_publication_references();
revoke all on function cms.enforce_specialist_publication_references() from public;
insert into cms.validation_policy(content_type,validator_version) values('specialist','specialist-1');
create or replace function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'record',r.id,'revision',v.id,'type',r.content_type,'path',r.path,'payload',v.payload,
  'locale',r.locale,'mediaStatus',cms.get_record_media_status(p_site,p_record,p_revision))
  ||case when r.content_type='destination' then jsonb_build_object('referenceStatus',cms.get_destination_reference_status(p_site,p_record,p_revision)) when r.content_type='navigation' then jsonb_build_object('navigationStatus',cms.get_navigation_reference_status(p_site,p_record,p_revision)) when r.content_type='settings' then jsonb_build_object('settingsStatus',cms.get_settings_reference_status(p_site,p_record,p_revision)) when r.content_type='specialist' then jsonb_build_object('specialistStatus',coalesce(cms.get_specialist_reference_status(p_site,p_record,p_revision),'[]'::jsonb)) when r.content_type='photoExpedition' then jsonb_build_object('expeditionStatus',coalesce(cms.get_expedition_reference_status(p_site,p_record,p_revision),'[]'::jsonb)) else '{}'::jsonb end
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision;
$$;


commit;
