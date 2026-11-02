begin;
-- The trusted validator handles the full schema; this trigger rechecks critical
-- publication invariants and locks the optional image against concurrent changes.
create function cms.enforce_testimonial_publication()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; media cms.media_objects;
begin
 if new.content_type<>'testimonial' or new.published_revision_id is null then return new; end if;
 if new.path is not null or new.locale<>'en' then raise exception 'testimonial_route_not_ready'; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.path is not distinct from old.path and new.locale is not distinct from old.locale and new.content_type is not distinct from old.content_type then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if payload->'verified' is distinct from 'true'::jsonb or payload#>>'{consent,status}' is distinct from 'granted' or coalesce(length(trim(payload#>>'{consent,evidence}')),0)=0 or coalesce(length(trim(payload->>'name')),0)=0 or coalesce(length(trim(payload->>'quote')),0)=0 or jsonb_typeof(payload->'anonymous') is distinct from 'boolean' then raise exception 'testimonial_consent_verification_required'; end if;
 if payload ? 'image' then
  select * into media from cms.media_objects where website_id=new.website_id and id=payload#>>'{image,assetId}' for share;
  if not found or media.mime_type<>'image/webp' or media.inspection_status<>'ready' or media.rights_status<>'approved' or media.archived_at is not null or (media.rights_expires_at is not null and media.rights_expires_at<=now()) then raise exception 'media_verification_required'; end if;
 end if;
 return new;
end $$;
create trigger cms_testimonial_publication_check before insert or update of published_revision_id,path,locale,content_type on cms.records for each row execute function cms.enforce_testimonial_publication();
revoke all on function cms.enforce_testimonial_publication() from public;
insert into cms.validation_policy(content_type,validator_version) values('testimonial','testimonial-1');
create or replace function cms.get_record_media_status(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; result jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found then return null; end if;
 if current_setting('role',true)<>'service_role' and not cms.can(p_site,'view',rec.content_type,rec.id) then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if not found then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',checked.id,'available',checked.available) order by checked.id),'[]') into result from (
  select refs.id,bool_and(case when refs.video then rec.content_type='homepage' and cms.hero_video_available(p_site,refs.id)
  else coalesce(m.inspection_status='ready' and m.mime_type<>'video/mp4' and m.rights_status='approved' and m.archived_at is null
   and (rec.content_type not in ('destination','journalArticle','settings','photoExpedition','specialist','page','homepage','testimonial') or m.mime_type='image/webp')
   and (m.rights_expires_at is null or m.rights_expires_at>now()),false) end) available
  from (
   select value #>> '{}' id,false video from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string'
   union all select value #>> '{}',true from jsonb_path_query(payload,'$.**.desktopAssetId') value where jsonb_typeof(value)='string'
   union all select value #>> '{}',true from jsonb_path_query(payload,'$.**.mobileAssetId') value where jsonb_typeof(value)='string'
  ) refs left join cms.media_objects m on m.website_id=p_site and m.id=refs.id group by refs.id
 ) checked;
 return result;
end $$;
commit;
