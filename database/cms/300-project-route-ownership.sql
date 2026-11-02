begin;
do $$ begin
 if exists(select 1 from cms.records where path='/projects' or (path like '/projects/%' and content_type<>'project')) or exists(select 1 from cms.page_redirects where source_path='/projects' or source_path like '/projects/%') then raise exception 'project_namespace_occupied';end if;
end $$;
create or replace function cms.is_custom_page_path(p_path text)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(length(p_path)<=500
  and p_path !~ '[^a-z0-9/-]'
  and p_path ~ '^/[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'
  and split_part(p_path,'/',2) <> all(array['about','admin','api','assets','auth','blog','blogs','brand','cms','concept','conservation-commitment','contact','destinations','documents','enquire','guided-bespoke-safaris','itineraries','journal','journeys','legal','login','logout','languages','mice','photo-expeditions','plan','private-aviation','register','reviews','projects','search','specialists','store','studio','tours']::text[]),false);
$$;
create function cms.enforce_project_namespace()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.path='/projects' or (new.path like '/projects/%' and new.content_type<>'project') then raise exception 'project_namespace_reserved';end if;return new;
end $$;
revoke all on function cms.enforce_project_namespace() from public;
create trigger cms_project_namespace before insert or update of path,content_type on cms.records for each row execute function cms.enforce_project_namespace();
commit;
