begin;
create function cms.enforce_expedition_publication_route()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;
begin
 if new.content_type<>'photoExpedition' or new.published_revision_id is null then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if new.locale<>'en' or new.path is null or new.path is distinct from '/photo-expeditions/'||(payload->>'slug') or new.path !~ '^/photo-expeditions/[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'expedition_route_not_ready'; end if;
 return new;
end $$;
create trigger cms_expedition_publication_route before insert or update of published_revision_id,path,locale,content_type on cms.records
 for each row execute function cms.enforce_expedition_publication_route();
revoke all on function cms.enforce_expedition_publication_route() from public;
-- Receipts must come from the strict expedition-1 worker. Public rollout remains separately configured.
insert into cms.validation_policy(content_type,validator_version) values('photoExpedition','expedition-1');
commit;
