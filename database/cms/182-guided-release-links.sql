begin;
-- This supplements trusted structural/schedule validation. It does not enable
-- the reserved route or authorize public delivery by itself.
create function cms.guided_href_available(p_site uuid,p_href text,p_locale text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare local_path text; host text;
begin
 if p_href is null or p_locale is distinct from 'en' then return false; end if;
 if p_href ~ '^#[a-z][a-z0-9-]*$' then return true; end if;
 if p_href='/plan?guided=true' or (p_href ~* '^https://(www\.)?safaricrafters\.com\.?(:443)?/' and regexp_replace(p_href,'^https://(www\.)?safaricrafters\.com\.?(:443)?','','i')='/plan?guided=true') then return true; end if;
 local_path:=cms.guided_link_path(p_href);
 if local_path is not null then return exists(select 1 from cms.navigation_public_paths n where n.path=local_path) or cms.concept_link_available(p_site,local_path,p_locale); end if;
 host:=rtrim(lower(substring(lower(p_href) from '^https://([^/:?#]+)')),'.');
 if host is null then return false; end if;
 if host='safaricrafters.com' or host like '%.safaricrafters.com' then return false; end if;
 return coalesce(cms.navigation_url_available(p_href),false);
end $$;
revoke all on function cms.guided_href_available(uuid,text,text) from public;
create function cms.guided_configured_links(p_sections jsonb)
returns setof text language plpgsql immutable set search_path='' as $$
declare section jsonb; item jsonb;
begin
 if jsonb_typeof(p_sections) is distinct from 'array' then raise exception 'guided_link_verification_required'; end if;
 for section in select value from jsonb_array_elements(p_sections) loop
  if section->>'kind'='guidedHero' then
   return next section#>>'{data,button,href}';return next section#>>'{data,scrollCue,anchor}';
  elsif section->>'kind'='guidedCompanion' and section#>>'{data,button,enabled}'='true' then return next section#>>'{data,button,link,href}';
  elsif section->>'kind'='guidedPaths' then
   if jsonb_typeof(section#>'{data,items}') is distinct from 'array' then raise exception 'guided_link_verification_required'; end if;
   for item in select value from jsonb_array_elements(section#>'{data,items}') loop return next item#>>'{action,href}'; end loop;
  end if;
 end loop;
end $$;
revoke all on function cms.guided_configured_links(jsonb) from public;
create function cms.enforce_guided_publication_links()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; sections jsonb; target uuid; dependency jsonb; related cms.records; asset text; href text;
begin
 if new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and old.content_type='page' and old.path='/guided-bespoke-safaris' and old.published_revision_id is not null and (new.path is distinct from old.path or new.content_type is distinct from old.content_type or new.locale is distinct from old.locale) then raise exception 'guided_route_not_ready'; end if;
 if new.path is distinct from '/guided-bespoke-safaris' then return new; end if;
 if new.content_type is distinct from 'page' or new.locale is distinct from 'en' then raise exception 'guided_route_not_ready'; end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.path is not distinct from old.path and new.locale is not distinct from old.locale and new.content_type is not distinct from old.content_type then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if jsonb_typeof(payload#>'{composition,sections}') is distinct from 'array' then raise exception 'guided_link_verification_required'; end if;
 select coalesce(jsonb_agg(value),'[]') into sections from jsonb_array_elements(payload#>'{composition,sections}') where coalesce(value#>>'{controls,visible}','true')<>'false' and (value#>>'{controls,visibleUntil}' is null or (value#>>'{controls,visibleUntil}')::timestamptz>clock_timestamp());
 -- Include future scheduled sections. Lock dependencies and their media before
 -- checking current public eligibility, in a stable record/asset order.
 for target in select r.id from cms.records r where r.website_id=new.website_id and r.locale=new.locale and r.path in(select cms.guided_link_path(value) from cms.guided_configured_links(sections) value) order by r.id loop
  if target=new.id then continue; end if;
  select * into related from cms.records where website_id=new.website_id and id=target for share;
  select v.payload into dependency from cms.revisions v where v.website_id=new.website_id and v.record_id=target and v.id=related.published_revision_id;
  for asset in select distinct value #>> '{}' from jsonb_path_query(dependency,'$.**.assetId') value where jsonb_typeof(value)='string' order by 1 loop
   perform 1 from cms.media_objects where website_id=new.website_id and id=asset for share;
  end loop;
 end loop;
 perform 1 from cms.navigation_public_paths order by path for share;
 for href in select value from cms.guided_configured_links(sections) value loop
  if not cms.guided_href_available(new.website_id,href,new.locale) then raise exception 'guided_link_verification_required'; end if;
 end loop;
 return new;
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then raise exception 'guided_link_verification_required';
end $$;
revoke all on function cms.enforce_guided_publication_links() from public;
create trigger guided_publication_links before insert or update of published_revision_id,path,locale,content_type on cms.records for each row execute function cms.enforce_guided_publication_links();
commit;
