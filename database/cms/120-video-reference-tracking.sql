begin;
-- Track all explicit media identity fields, including hidden draft sections.
-- Conservative reference protection is separate from publication eligibility.
create or replace function cms.payload_uses_asset(p_payload jsonb,p_asset text)
returns boolean language sql immutable set search_path='' as $$
 select jsonb_path_exists(p_payload,'$.**.assetId ? (@ == $asset)',jsonb_build_object('asset',p_asset))
 or jsonb_path_exists(p_payload,'$.**.desktopAssetId ? (@ == $asset)',jsonb_build_object('asset',p_asset))
 or jsonb_path_exists(p_payload,'$.**.mobileAssetId ? (@ == $asset)',jsonb_build_object('asset',p_asset));
$$;
create or replace function cms.check_unarchived_references(p_site uuid,p_payload jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare asset text; archived timestamptz;
begin
 for asset in select distinct value #>> '{}' from (
  select value from jsonb_path_query(p_payload,'$.**.assetId') value
  union all select value from jsonb_path_query(p_payload,'$.**.desktopAssetId') value
  union all select value from jsonb_path_query(p_payload,'$.**.mobileAssetId') value
 ) refs where jsonb_typeof(value)='string' order by 1 loop
  select archived_at into archived from cms.media_objects where website_id=p_site and id=asset for share;
  if found and archived is not null then raise exception 'archived_media_reference'; end if;
 end loop;
end $$;
commit;
