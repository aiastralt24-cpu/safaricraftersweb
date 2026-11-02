begin;
create function cms.get_expedition_reference_status(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; target uuid; related cms.records; public_value jsonb; evidence jsonb:='[]'; available boolean;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='photoExpedition';
 if not found then return null; end if;
 if current_setting('role',true)<>'service_role' and not cms.can(p_site,'view','photoExpedition',rec.id) then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=p_revision;
 if not found or jsonb_typeof(payload->'specialists') is distinct from 'array' then return null; end if;
 if jsonb_array_length(payload->'specialists')>20 then return null; end if;
 for target in select distinct raw_id::uuid from (
  select item->>'recordId' raw_id from jsonb_array_elements(payload->'specialists') item
  union all select payload#>>'{enquiry,form,recordId}' where payload#>>'{enquiry,form,recordId}' is not null
 ) ids loop
  if target is null then return null; end if;
  available:=false;
  select * into related from cms.records where website_id=p_site and id=target and id<>rec.id and locale=rec.locale and locale='en' and published_revision_id is not null;
  if found then
   if related.content_type='specialist' then
    available:=cms.get_public_specialist(p_site,target,rec.locale) is not null;
   elsif related.content_type='form' then
    public_value:=cms.get_published_form(p_site,target);
    if public_value is not null and public_value->>'locale'='en' and public_value->'definition'->'schemaVersion'='1'::jsonb and jsonb_typeof(public_value->'definition'->'fields')='array' then
     available:=jsonb_array_length(public_value->'definition'->'fields') between 1 and 50 and not exists(select 1 from jsonb_array_elements(public_value->'definition'->'fields') f where f->>'type'='file');
    end if;
   end if;
  end if;
  evidence:=evidence||jsonb_build_array(case when available then jsonb_build_object('recordId',target,'available',true,'type',related.content_type,'locale',related.locale,'publishedRevisionId',related.published_revision_id) else jsonb_build_object('recordId',target,'available',false) end);
 end loop;
 return evidence;
exception when invalid_text_representation then return null;
end $$;
revoke all on function cms.get_expedition_reference_status(uuid,uuid,uuid) from public;
grant execute on function cms.get_expedition_reference_status(uuid,uuid,uuid) to authenticated,service_role;
create or replace function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'record',r.id,'revision',v.id,'type',r.content_type,'path',r.path,'payload',v.payload,
  'locale',r.locale,'mediaStatus',cms.get_record_media_status(p_site,p_record,p_revision))
  ||case when r.content_type='destination' then jsonb_build_object('referenceStatus',cms.get_destination_reference_status(p_site,p_record,p_revision)) when r.content_type='navigation' then jsonb_build_object('navigationStatus',cms.get_navigation_reference_status(p_site,p_record,p_revision)) when r.content_type='settings' then jsonb_build_object('settingsStatus',cms.get_settings_reference_status(p_site,p_record,p_revision)) when r.content_type='specialist' then jsonb_build_object('specialistStatus',cms.get_specialist_reference_status(p_site,p_record,p_revision)) when r.content_type='photoExpedition' then jsonb_build_object('expeditionStatus',cms.get_expedition_reference_status(p_site,p_record,p_revision)) else '{}'::jsonb end
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision;
$$;
-- Publication remains disabled until full policy and dependency rechecks are implemented.
commit;
