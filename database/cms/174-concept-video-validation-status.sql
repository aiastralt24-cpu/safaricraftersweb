begin;
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
  select refs.id,bool_and(case when refs.video then (rec.content_type='homepage' or (rec.content_type='page' and rec.path='/concept' and rec.locale='en')) and cms.hero_video_available(p_site,refs.id)
  else coalesce(m.inspection_status='ready' and m.mime_type<>'video/mp4' and m.rights_status='approved' and m.archived_at is null
   and (rec.content_type not in ('destination','journalArticle','settings','photoExpedition','specialist','page','homepage') or m.mime_type='image/webp')
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
