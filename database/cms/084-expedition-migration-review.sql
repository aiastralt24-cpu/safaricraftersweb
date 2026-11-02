begin;
create function cms.review_expedition_migration_links(p_site uuid,p_assets text[],p_references jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare assets jsonb; refs jsonb; item jsonb;
begin
 if not cms.can(p_site,'create','photoExpedition',null) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_assets is null or cardinality(p_assets)>500 or array_position(p_assets,null) is not null
  or (select count(distinct v) from unnest(p_assets) v)<>cardinality(p_assets)
  or exists(select 1 from unnest(p_assets) v where v !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$') then raise exception 'invalid_migration_assets'; end if;
 if p_references is null or jsonb_typeof(p_references)<>'array' or jsonb_array_length(p_references)>500 then raise exception 'invalid_migration_references'; end if;
 for item in select value from jsonb_array_elements(p_references) loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'type','') not in ('specialist','form') or coalesce(item->>'recordId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then raise exception 'invalid_migration_references'; end if;
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',a.id,'available',coalesce(m.id is not null and cms.can(p_site,'view','document',null) and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()),false)) order by a.n),'[]') into assets
 from unnest(p_assets) with ordinality a(id,n) left join cms.media_objects m on m.website_id=p_site and m.id=a.id;
 select coalesce(jsonb_agg(case when r.id is null or not cms.can(p_site,'view',r.content_type,r.id)
  then jsonb_build_object('recordId',q.value->>'recordId','type',q.value->>'type','available',false)
  else jsonb_build_object('recordId',q.value->>'recordId','type',q.value->>'type','available',true,'locale',r.locale) end order by q.n),'[]') into refs
 from jsonb_array_elements(p_references) with ordinality q(value,n) left join cms.records r on r.website_id=p_site and r.id=(q.value->>'recordId')::uuid and r.content_type=q.value->>'type';
 return jsonb_build_object('assets',assets,'references',refs);
end $$;
revoke all on function cms.review_expedition_migration_links(uuid,text[],jsonb) from public;
grant execute on function cms.review_expedition_migration_links(uuid,text[],jsonb) to authenticated;
commit;
