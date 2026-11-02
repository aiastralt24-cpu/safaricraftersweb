begin;
-- Defense in depth only: this does not enable the homepage validation policy.
create function cms.enforce_homepage_publication_references()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; sections jsonb; section jsonb; item jsonb; target uuid; related cms.records; dependency jsonb; asset text; href text; expected text;
begin
 if new.content_type<>'homepage' or new.published_revision_id is null then return new; end if;
 if new.path is distinct from '/' or new.locale is distinct from 'en' then raise exception 'homepage_route_not_ready'; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.path is not distinct from old.path and new.locale is not distinct from old.locale and new.content_type is not distinct from old.content_type then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if jsonb_typeof(payload#>'{composition,sections}') is distinct from 'array' then raise exception 'homepage_reference_verification_required'; end if;
 select coalesce(jsonb_agg(value),'[]') into sections from jsonb_array_elements(payload#>'{composition,sections}') where value#>'{controls,visible}'='true'::jsonb and (value#>>'{controls,visibleUntil}' is null or (value#>>'{controls,visibleUntil}')::timestamptz>now());
 -- Future sections also need current published dependencies. Lock all direct
 -- reference and dynamic-link records in identity order before reading pointers.
 for target in select distinct r.id from cms.records r where r.website_id=new.website_id and (
  r.id in (select (value #>> '{}')::uuid from jsonb_path_query(sections,'$[*].data.**.recordId') value)
  or r.path in (select value #>> '{}' from jsonb_path_query(sections,'$[*].data.**.href') value)
 ) order by r.id loop
  if target=new.id then continue; end if;
  select * into related from cms.records where website_id=new.website_id and id=target for share;
  select v.payload into dependency from cms.revisions v where v.website_id=new.website_id and v.record_id=target and v.id=related.published_revision_id;
  for asset in select distinct value #>> '{}' from jsonb_path_query(dependency,'$.**.assetId') value where jsonb_typeof(value)='string' order by 1 loop
   perform 1 from cms.media_objects where website_id=new.website_id and id=asset for share;
  end loop;
 end loop;
 for section in select value from jsonb_array_elements(sections) loop
  expected:=case section->>'kind' when 'homepageJourneys' then 'journey' when 'homepageGuestNotes' then 'testimonial' when 'homepageDepartures' then 'photoExpedition' else null end;
  if expected is not null then
   for item in select value from jsonb_array_elements(case when expected='photoExpedition' then section#>'{data,overrides}' else section#>'{data,items}' end) loop
    target:=(item->>'recordId')::uuid;
    select * into related from cms.records where website_id=new.website_id and id=target and locale=new.locale and content_type=expected and published_revision_id is not null;
    if not found then raise exception 'homepage_reference_verification_required'; end if;
    if expected='testimonial' then
     if cms.get_public_homepage_guest(new.website_id,target,new.locale) is null then raise exception 'homepage_reference_verification_required'; end if;
    elsif expected='photoExpedition' then
     if cms.get_public_expedition(new.website_id,related.path,new.locale) is null then raise exception 'homepage_reference_verification_required'; end if;
    else
     select v.payload into dependency from cms.revisions v where v.website_id=new.website_id and v.record_id=target and v.id=related.published_revision_id;
     if cms.get_public_page(new.website_id,related.path,new.locale) is null or not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(dependency->'media')='array' then dependency->'media' else '[]'::jsonb end) m where m->>'role'='hero' and length(trim(m->>'assetId'))>0 and length(trim(m->>'alt'))>0) then raise exception 'homepage_reference_verification_required'; end if;
    end if;
   end loop;
  end if;
 end loop;
 for href in select distinct value #>> '{}' from jsonb_path_query(sections,'$[*].data.**.href') value loop
  -- Anchor schedules and mailto syntax remain the trusted editorial validator's responsibility.
  if href like '#%' or href like 'mailto:%' or cms.navigation_url_available(href) then continue; end if;
  if href not like '/%' or cms.get_public_page(new.website_id,href,new.locale) is null then raise exception 'homepage_link_verification_required'; end if;
 end loop;
 return new;
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then raise exception 'homepage_reference_verification_required';
end $$;
revoke all on function cms.enforce_homepage_publication_references() from public;
create trigger cms_homepage_reference_check before insert or update of published_revision_id,path,locale,content_type on cms.records for each row execute function cms.enforce_homepage_publication_references();
commit;
