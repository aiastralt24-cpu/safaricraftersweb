begin;
-- Mixed source evidence only: each established reader enforces its own processing
-- policy. Applying a reviewed draft must recheck under transaction locks.
create function cms.review_aviation_migration_media(p_site uuid,p_bindings jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare item jsonb; observed jsonb; result jsonb:='[]';
begin
 if not cms.can(p_site,'view','document') then raise exception 'forbidden' using errcode='42501'; end if;
 if p_bindings is null or jsonb_typeof(p_bindings) is distinct from 'array' then raise exception 'invalid_aviation_media_bindings'; end if;
 if jsonb_array_length(p_bindings)<>5
  or (select count(distinct value->>'assetId') from jsonb_array_elements(p_bindings))<>5
  or (select count(*) from jsonb_array_elements(p_bindings) where value->>'kind'='image')<>4
  or (select count(*) from jsonb_array_elements(p_bindings) where value->>'kind'='video')<>1 then raise exception 'invalid_aviation_media_bindings'; end if;
 for item in select value from jsonb_array_elements(p_bindings) loop
  if jsonb_typeof(item) is distinct from 'object' then raise exception 'invalid_aviation_media_bindings'; end if;
  if not(item ?& array['kind','assetId','sourceSha256']) or (select count(*) from jsonb_object_keys(item))<>3 then raise exception 'invalid_aviation_media_bindings'; end if;
  observed:=case when item->>'kind'='video' then cms.review_hero_video_migration_media(p_site,jsonb_build_array(item-'kind')) else cms.review_guided_migration_media(p_site,jsonb_build_array(item-'kind')) end;
  result:=result||jsonb_build_array((observed->0)||jsonb_build_object('kind',item->>'kind'));
 end loop;
 return result;
end $$;
revoke all on function cms.review_aviation_migration_media(uuid,jsonb) from public;
grant execute on function cms.review_aviation_migration_media(uuid,jsonb) to authenticated;
commit;
