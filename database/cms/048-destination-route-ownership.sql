begin;
create table cms.destination_reserved_paths(path text primary key check(path ~ '^/destinations/[a-z0-9]+(-[a-z0-9]+)*$'));
alter table cms.destination_reserved_paths enable row level security;
revoke all on cms.destination_reserved_paths from public,anon,authenticated;
insert into cms.destination_reserved_paths(path) values
 ('/destinations/africa'),
 ('/destinations/americas'),
 ('/destinations/arctic-beyond'),
 ('/destinations/botswana'),
 ('/destinations/brazil'),
 ('/destinations/canada'),
 ('/destinations/chile-and-argentina'),
 ('/destinations/colombia'),
 ('/destinations/costa-rica'),
 ('/destinations/ecuador'),
 ('/destinations/india'),
 ('/destinations/kenya'),
 ('/destinations/namibia'),
 ('/destinations/norway'),
 ('/destinations/panama'),
 ('/destinations/peru'),
 ('/destinations/russia'),
 ('/destinations/rwanda'),
 ('/destinations/south-africa'),
 ('/destinations/tanzania'),
 ('/destinations/uganda'),
 ('/destinations/uganda-rwanda'),
 ('/destinations/usa'),
 ('/destinations/zambia'),
 ('/destinations/zambia-and-zimbabwe'),
 ('/destinations/zimbabwe');
create function cms.enforce_destination_route_ownership()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.content_type='destination' and new.published_revision_id is not null
  and exists(select 1 from cms.destination_reserved_paths where path=new.path) then
  raise exception 'destination_reserved_route';
 end if;
 return new;
end $$;
create trigger cms_destination_route_ownership before insert or update of published_revision_id,path,content_type on cms.records
 for each row execute function cms.enforce_destination_route_ownership();
revoke all on function cms.enforce_destination_route_ownership() from public;
commit;
