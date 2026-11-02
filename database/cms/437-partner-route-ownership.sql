begin;
-- Hold writers while checking existing routes and installing ownership rules.
lock table cms.records,cms.page_redirects in share row exclusive mode;
do $$ begin
 if exists(select 1 from cms.records where path in('/partners') or ((path like '/partners/%') and content_type<>'partner')) or exists(select 1 from cms.page_redirects where source_path in('/partners') or source_path like '/partners/%') then raise exception 'partner_namespace_occupied';end if;
end $$;
create or replace function cms.is_custom_page_path(p_path text)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(length(p_path)<=500
  and p_path !~ '[^a-z0-9/-]'
  and p_path ~ '^/[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'
  and split_part(p_path,'/',2) <> all(array['about','admin','api','assets','auth','blog','blogs','brand','cms','concept','conservation-commitment','contact','destinations','documents','enquire','guided-bespoke-safaris','itineraries','journal','journeys','legal','login','logout','languages','mice','photo-expeditions','plan','private-aviation','register','reviews','projects','news','events','leadership','applications','industries','locations','careers','certifications','partners','search','specialists','store','studio','tours']::text[]),false);
$$;
create function cms.enforce_partner_namespace()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.path in('/partners') or ((new.path like '/partners/%') and new.content_type<>'partner') then raise exception 'partner_namespace_reserved';end if;return new;
end $$;
revoke all on function cms.enforce_partner_namespace() from public;
create trigger cms_partner_namespace before insert or update of path,content_type on cms.records for each row execute function cms.enforce_partner_namespace();
commit;
