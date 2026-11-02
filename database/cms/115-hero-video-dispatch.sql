begin;
-- Discovery is advisory: claim_hero_video_upload still fences concurrent workers.
create function cms.list_hero_video_work(p_limit integer default 5)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if p_limit is null or p_limit<1 or p_limit>20 then raise exception 'invalid_video_batch'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('site',q.website_id,'id',q.id)) from (
  select u.website_id,u.id from cms.uploads u
  where u.mime_type='video/mp4' and (
   (u.status='reserved' and u.expires_at>now() and exists (
    select 1 from storage.objects o where o.bucket_id='cms-video-originals' and o.name=u.storage_key))
   or u.status in ('uploaded','failed') or (u.status='processing' and u.leased_until<=now()))
  order by u.created_at,u.id limit p_limit
 ) q),'[]'::jsonb);
end $$;
revoke all on function cms.list_hero_video_work(integer) from public;
grant execute on function cms.list_hero_video_work(integer) to service_role;
commit;
