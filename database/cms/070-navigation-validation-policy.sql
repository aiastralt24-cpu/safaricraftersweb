begin;
create or replace function cms.get_navigation_reference_status(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='navigation';
 if not found then return null; end if;
 if current_setting('role',true)<>'service_role' and not cms.can(p_site,'view','navigation',rec.id) then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=p_revision;
 if not found then return null; end if;
 -- Malformed/unsupported drafts must produce validation findings, not endless worker retries.
 return coalesce(cms.navigation_reference_evidence(p_site,payload,rec.locale),'[]'::jsonb);
end $$;
create or replace function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'record',r.id,'revision',v.id,'type',r.content_type,'path',r.path,'payload',v.payload,
  'locale',r.locale,'mediaStatus',cms.get_record_media_status(p_site,p_record,p_revision))
  ||case when r.content_type='destination' then jsonb_build_object('referenceStatus',cms.get_destination_reference_status(p_site,p_record,p_revision)) when r.content_type='navigation' then jsonb_build_object('navigationStatus',cms.get_navigation_reference_status(p_site,p_record,p_revision)) else '{}'::jsonb end
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision;
$$;
insert into cms.validation_policy(content_type,validator_version) values('navigation','navigation-1');
commit;
