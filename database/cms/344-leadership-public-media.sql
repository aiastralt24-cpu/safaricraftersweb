begin;
-- Admit only assets in the currently deliverable, allowlisted Leadership projection.
-- Existing page families retain their prior admission checks.
alter function cms.media_is_published(uuid,text) rename to media_is_published_before_leadership;
revoke all on function cms.media_is_published_before_leadership(uuid,text) from public,anon,authenticated,service_role;
create function cms.media_is_published(p_site uuid,p_asset text)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.media_is_published_before_leadership(p_site,p_asset) or exists(
  select 1 from cms.records r
  where r.website_id=p_site and r.content_type='leadership' and r.locale='en'
   and r.published_revision_id is not null
   and exists(select 1 from jsonb_path_query(
    cms.get_public_leadership(p_site,r.path,r.locale)->'payload','$.**.assetId') asset
    where asset=to_jsonb(p_asset)));
$$;
revoke all on function cms.media_is_published(uuid,text) from public;
commit;
