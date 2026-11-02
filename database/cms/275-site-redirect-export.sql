begin;
-- One statement reads the complete inventory, avoiding mixed pagination snapshots.
create function cms.export_site_redirects(p_site uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare items jsonb; result jsonb;
begin
 if not cms.can(p_site,'view','page') or not cms.can(p_site,'export','page') then
  raise exception 'forbidden' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(x.item order by x.locale collate "C",x.source_path collate "C"),'[]'::jsonb) into items from (
  select a.locale,a.source_path,jsonb_build_object('recordId',r.id,'locale',a.locale,'sourcePath',a.source_path,
   'destinationPath',r.path,'destinationPublished',r.published_revision_id is not null,'status',308,
   'enabled',coalesce(s.enabled,true),'addressReserved',true,'version',coalesce(s.version,0)) item
  from cms.page_redirects a join cms.records r on r.website_id=a.website_id and r.id=a.record_id and r.locale=a.locale
  left join cms.page_redirect_states s on s.website_id=a.website_id and s.locale=a.locale and s.source_path=a.source_path
  where a.website_id=p_site and r.content_type='page' and cms.can(p_site,'view','page',r.id) and cms.can(p_site,'export','page',r.id)
  order by a.locale collate "C",a.source_path collate "C" limit 10001
 ) x;
 if jsonb_array_length(items)>10000 then raise exception 'redirect_export_too_large'; end if;
 result:=jsonb_build_object('schemaVersion',1,'kind','cms-site-redirects','site',p_site,'exportedAt',now(),
  'redirects',items);
 insert into cms.audit_events(website_id,actor_id,action,details)
 values(p_site,auth.uid(),'site.redirect_export_read',jsonb_build_object('count',jsonb_array_length(items)));
 return result;
end $$;
revoke all on function cms.export_site_redirects(uuid) from public,anon;
grant execute on function cms.export_site_redirects(uuid) to authenticated;
commit;
