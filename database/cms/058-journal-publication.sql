begin;
-- Cover image references inside all composed sections, including hidden sections.
create or replace function cms.record_media_available(p_site uuid,p_type text,p_payload jsonb)
returns boolean language sql stable security definer set search_path='' as $$
 select (p_type<>'journey' or cms.journey_media_available(p_site,p_payload)) and not exists(
  select 1 from jsonb_path_query(p_payload,'$.**.assetId') value
  left join cms.media_objects m on m.website_id=p_site and m.id=value #>> '{}'
  where jsonb_typeof(value)<>'string' or m.id is null or m.inspection_status<>'ready'
   or m.rights_status<>'approved' or m.archived_at is not null
   or (p_type in ('destination','journalArticle') and m.mime_type<>'image/webp')
   or (m.rights_expires_at is not null and m.rights_expires_at<=now())
 );
$$;

create or replace function cms.get_record_media_status(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; result jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found then return null; end if;
 if current_setting('role',true)<>'service_role' and not cms.can(p_site,'view',rec.content_type,rec.id) then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if not found then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',refs.id,'available',coalesce(
  m.inspection_status='ready' and m.rights_status='approved' and m.archived_at is null
  and (rec.content_type not in ('destination','journalArticle') or m.mime_type='image/webp')
  and (m.rights_expires_at is null or m.rights_expires_at>now()),false)) order by refs.id),'[]') into result
 from (select distinct value #>> '{}' id from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string') refs
 left join cms.media_objects m on m.website_id=p_site and m.id=refs.id;
 return result;
end $$;

create or replace function cms.enforce_published_media()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; asset text; media cms.media_objects;
begin
 if new.published_revision_id is null or new.published_revision_id is not distinct from old.published_revision_id then return new; end if;
 select v.payload into payload from cms.revisions v where v.id=new.published_revision_id and v.website_id=new.website_id and v.record_id=new.id;
 if new.content_type='journey' and payload ? 'media' and jsonb_typeof(payload->'media') is distinct from 'array' then raise exception 'media_verification_required'; end if;
 if exists(select 1 from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)<>'string') then raise exception 'media_verification_required'; end if;
 for asset in select distinct value #>> '{}' from jsonb_path_query(payload,'$.**.assetId') value order by 1 loop
  select * into media from cms.media_objects where website_id=new.website_id and id=asset for share;
  if not found or media.inspection_status<>'ready' or media.rights_status<>'approved' or media.archived_at is not null
   or (new.content_type in ('destination','journalArticle') and media.mime_type<>'image/webp')
   or (media.rights_expires_at is not null and media.rights_expires_at<=now()) then raise exception 'media_verification_required'; end if;
 end loop;
 -- Retain the journey contract's handling of malformed entries without asset IDs.
 if new.content_type='journey' and not cms.journey_media_available(new.website_id,payload) then raise exception 'media_verification_required'; end if;

 return new;
end $$;
-- Existing grants remain unchanged; the trigger rechecks MIME under its asset lock.
create or replace function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'record',r.id,'revision',v.id,'type',r.content_type,'path',r.path,'payload',v.payload,
  'locale',r.locale,'mediaStatus',cms.get_record_media_status(p_site,p_record,p_revision))
  ||case when r.content_type='destination' then jsonb_build_object('referenceStatus',cms.get_destination_reference_status(p_site,p_record,p_revision)) else '{}'::jsonb end
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision;
$$;
create function cms.enforce_journal_publication_route()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;
begin
 if new.content_type<>'journalArticle' or new.published_revision_id is null then return new; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if new.locale<>'en' or new.path is null or new.path is distinct from '/journal/'||(payload->>'slug') or new.path !~ '^/journal/[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'journal_route_not_ready'; end if;
 return new;
end $$;
create trigger cms_journal_publication_route before insert or update of published_revision_id,path,locale,content_type on cms.records
 for each row execute function cms.enforce_journal_publication_route();
revoke all on function cms.enforce_journal_publication_route() from public;
insert into cms.validation_policy(content_type,validator_version) values('journalArticle','journal-1');
commit;
