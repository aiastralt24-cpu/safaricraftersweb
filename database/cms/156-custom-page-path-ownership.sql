begin;
-- Namespace eligibility only; this does not authorize saving or publishing.
create function cms.is_custom_page_path(p_path text)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(length(p_path)<=500
  and p_path !~ '[^a-z0-9/-]'
  and p_path ~ '^/[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'
  and split_part(p_path,'/',2) <> all(array['about','admin','api','assets','auth','blog','blogs','brand','cms','concept','conservation-commitment','contact','destinations','documents','enquire','guided-bespoke-safaris','itineraries','journal','journeys','legal','login','logout','mice','photo-expeditions','plan','private-aviation','register','reviews','search','specialists','store','studio','tours']::text[]),false);
$$;
revoke all on function cms.is_custom_page_path(text) from public;
grant execute on function cms.is_custom_page_path(text) to authenticated,service_role;
commit;
