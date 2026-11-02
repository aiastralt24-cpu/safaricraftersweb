begin;
-- Dependency checks supplement the trusted structural receipt. The reserved-route
-- gate remains closed; this migration does not authorize MICE delivery.
create function cms.assert_mice_publication_dependencies(p_site uuid,p_payload jsonb,p_locale text)
returns void language plpgsql security definer set search_path='' as $$
declare sections jsonb; section jsonb; refs uuid[]:='{}'; form_id uuid; form jsonb; href text; target uuid; related cms.records; dependency jsonb; asset text;
begin
 if p_locale is distinct from 'en' or jsonb_typeof(p_payload) is distinct from 'object'
  or p_payload-'composition'-'seo'<>'{}'::jsonb or jsonb_typeof(p_payload#>'{composition,sections}') is distinct from 'array' then raise exception 'mice_content_invalid'; end if;
 select coalesce(jsonb_agg(value),'[]') into sections from jsonb_array_elements(p_payload#>'{composition,sections}') where value#>'{controls,visible}' is distinct from 'false'::jsonb;
 for section in select value from jsonb_array_elements(sections) loop
  if coalesce(section->>'kind','') not in ('miceHero','miceIntroduction','miceFormats','miceDestinations','miceProcess','miceEnquiry') then raise exception 'mice_section_unsupported'; end if;
  if coalesce(section#>'{controls,regions}','[]'::jsonb)<>'[]'::jsonb or coalesce(section#>>'{controls,animation}','none')<>'none' then raise exception 'mice_controls_unsupported'; end if;
  if section->>'kind'='miceEnquiry' then
   if coalesce(section#>>'{data,form,recordId}','')!~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then raise exception 'mice_form_unavailable'; end if;
   refs:=array_append(refs,(section#>>'{data,form,recordId}')::uuid);
  end if;
 end loop;
 if cardinality(refs)=0 then raise exception 'mice_form_unavailable'; end if;
 -- Include future sections and acquire all referenced record locks in ID order.
 for target in select r.id from cms.records r where r.website_id=p_site and
   (r.id=any(refs) or (r.locale=p_locale and r.path in(select value#>>'{}' from jsonb_path_query(sections,'$.**.href') value where jsonb_typeof(value)='string'))) order by r.id loop
  select * into related from cms.records where website_id=p_site and id=target for share;
  select v.payload into dependency from cms.revisions v where v.website_id=p_site and v.record_id=target and v.id=related.published_revision_id;
  for asset in select distinct value#>>'{}' from jsonb_path_query(dependency,'$.**.assetId') value where jsonb_typeof(value)='string' order by 1 loop
   perform 1 from cms.media_objects where website_id=p_site and id=asset for share;
  end loop;
 end loop;
 for form_id in select distinct id from unnest(refs) id loop
  form:=cms.get_published_form(p_site,form_id);
  if form is null or form->>'locale' is distinct from 'en' or not cms.mice_form_compatible(form->'definition') then raise exception 'mice_form_unavailable'; end if;
 end loop;
 perform 1 from cms.navigation_public_paths order by path for share;
 for href in select value#>>'{}' from jsonb_path_query(sections,'$.**.href') value loop
  -- Anchor existence and visibility at every boundary belong to structural validation.
  if href ~ '^#[a-z][a-z0-9-]*$' or href ~ '^/mice(#[a-z][a-z0-9-]*)?$' then continue; end if;
  if href is null or href !~ '^/[a-z0-9/-]*$' or href like '%//%' then raise exception 'mice_link_unavailable'; end if;
  if not exists(select 1 from cms.navigation_public_paths where path=href) and not cms.concept_link_available(p_site,href,p_locale) then raise exception 'mice_link_unavailable'; end if;
 end loop;
end $$;
revoke all on function cms.assert_mice_publication_dependencies(uuid,jsonb,text) from public;
create function cms.enforce_mice_page_release()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;
begin
 if new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and old.path='/mice' and old.published_revision_id is not null and (new.path is distinct from old.path or new.content_type is distinct from old.content_type or new.locale is distinct from old.locale) then raise exception 'mice_route_not_ready'; end if;
 if new.path is distinct from '/mice' then return new; end if;
 if new.content_type is distinct from 'page' or new.locale is distinct from 'en' then raise exception 'mice_route_not_ready'; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 perform cms.assert_mice_publication_dependencies(new.website_id,payload,new.locale);
 return new;
end $$;
revoke all on function cms.enforce_mice_page_release() from public;
create trigger cms_mice_page_release before insert or update of published_revision_id,path,locale,content_type on cms.records for each row execute function cms.enforce_mice_page_release();
commit;
