begin;
-- Hold writers while checking existing routes and installing ownership rules.
lock table cms.records,cms.page_redirects in share row exclusive mode;
do $$ begin
 if exists(select 1 from cms.records where path in('/applications','/industries') or ((path like '/applications/%' or path like '/industries/%') and content_type<>'application')) or exists(select 1 from cms.page_redirects where source_path in('/applications','/industries') or source_path like '/applications/%' or source_path like '/industries/%') then raise exception 'application_namespace_occupied';end if;
end $$;
create or replace function cms.is_custom_page_path(p_path text)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(length(p_path)<=500
  and p_path !~ '[^a-z0-9/-]'
  and p_path ~ '^/[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'
  and split_part(p_path,'/',2) <> all(array['about','admin','api','assets','auth','blog','blogs','brand','cms','concept','conservation-commitment','contact','destinations','documents','enquire','guided-bespoke-safaris','itineraries','journal','journeys','legal','login','logout','languages','mice','photo-expeditions','plan','private-aviation','register','reviews','projects','news','events','leadership','applications','industries','search','specialists','store','studio','tours']::text[]),false);
$$;
create function cms.enforce_application_namespace()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.path in('/applications','/industries') or ((new.path like '/applications/%' or new.path like '/industries/%') and new.content_type<>'application') then raise exception 'application_namespace_reserved';end if;return new;
end $$;
revoke all on function cms.enforce_application_namespace() from public;
create trigger cms_application_namespace before insert or update of path,content_type on cms.records for each row execute function cms.enforce_application_namespace();
commit;
