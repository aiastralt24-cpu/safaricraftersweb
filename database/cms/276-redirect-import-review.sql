begin;
create function cms.review_redirect_import(p_site uuid,p_items jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare item jsonb; target cms.records; alias cms.page_redirects; state cms.page_redirect_states;
 items jsonb:='[]'; status text; reason text; stamp text; i integer:=0;
begin
 if not cms.can(p_site,'view','page') or not cms.can(p_site,'edit','page') then raise exception 'forbidden' using errcode='42501'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'invalid_redirect_import'; end if;
 if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>100 then raise exception 'invalid_redirect_import'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x group by x->>'locale',x->>'sourcePath' having count(*)>1) then raise exception 'duplicate_redirect_source'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>5
   or not item ?& array['sourcePath','destinationPath','locale','enabled','recordId']
   or not coalesce(cms.is_custom_page_path(item->>'sourcePath'),false) or not coalesce(cms.is_custom_page_path(item->>'destinationPath'),false)
   or item->>'sourcePath'=item->>'destinationPath' or not coalesce(item->>'locale' ~ '^[a-z]{2,3}(-[A-Z]{2})?$',false)
   or jsonb_typeof(item->'enabled')<>'boolean' or jsonb_typeof(item->'recordId') not in ('null','string') then raise exception 'invalid_redirect_import'; end if;
  target:=null;alias:=null;state:=null;stamp:=null;status:='blocked';reason:='destination_unavailable';
  select * into target from cms.records where website_id=p_site and content_type='page' and locale=item->>'locale' and path=item->>'destinationPath';
  if target.id is not null and cms.can(p_site,'view','page',target.id) and cms.can(p_site,'edit','page',target.id) then
   if item->>'recordId' is not null and (item->>'recordId')::uuid<>target.id then reason:='identity_changed';
   elsif exists(select 1 from cms.records where website_id=p_site and locale=item->>'locale' and path=item->>'sourcePath') then reason:='source_unavailable';
   else
    select * into alias from cms.page_redirects where website_id=p_site and locale=item->>'locale' and source_path=item->>'sourcePath';
    if alias.record_id is not null and alias.record_id<>target.id then reason:='source_unavailable';
    else
     select * into state from cms.page_redirect_states where website_id=p_site and locale=item->>'locale' and source_path=item->>'sourcePath';
     reason:='eligible';status:=case when alias.record_id is null then 'new' when coalesce(state.enabled,true)=(item->>'enabled')::boolean then 'unchanged' else 'change_state' end;
     stamp:=md5(jsonb_build_object('input',item,'target',target.id,'revision',target.current_revision_id,'published',target.published_revision_id,'alias',alias.record_id,'version',coalesce(state.version,0),'enabled',coalesce(state.enabled,true))::text);
    end if;
   end if;
  end if;
  items:=items||jsonb_build_array(item||jsonb_build_object('index',i,'status',status,'reason',reason,'target',case when status<>'blocked' then target.id end,'published',case when status<>'blocked' then target.published_revision_id is not null end,'snapshot',stamp));i:=i+1;
 end loop;
 return jsonb_build_object('site',p_site,'items',items);
end $$;
revoke all on function cms.review_redirect_import(uuid,jsonb) from public,anon;
grant execute on function cms.review_redirect_import(uuid,jsonb) to authenticated;
commit;
