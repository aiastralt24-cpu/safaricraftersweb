begin;
update cms.validation_policy set validator_version='journey-2' where content_type='journey';
-- Each ID names one immutable stored object/version. Replacements receive new IDs.
create table cms.media_objects (
 website_id uuid not null references cms.websites(id),
 id text not null check(id ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$'),
 storage_key text not null check(length(storage_key) between 1 and 1000),
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','image/avif')),
 byte_size bigint not null check(byte_size>0 and byte_size<=25000000),
 width integer not null check(width between 1 and 50000),
 height integer not null check(height between 1 and 50000),
 inspection_status text not null default 'quarantined' check(inspection_status in ('quarantined','ready','rejected')),
 rights_status text not null default 'pending' check(rights_status in ('pending','approved','revoked')),
 rights_evidence text not null default '' check(length(rights_evidence)<=5000),
 rights_expires_at timestamptz,
 archived_at timestamptz,
 created_at timestamptz not null default now(),
 primary key(website_id,id),unique(storage_key),
 check(rights_status<>'approved' or length(trim(rights_evidence))>0)
);
alter table cms.media_objects enable row level security;
grant select,insert on cms.media_objects to service_role;
grant update(inspection_status,rights_status,rights_evidence,rights_expires_at,archived_at) on cms.media_objects to service_role;

-- Only assets referenced by an already-authorized record are returned, and never
-- storage keys or rights evidence. This function is also used by the trusted reader.
create function cms.get_record_media_status(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; result jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found then return null; end if;
 if current_setting('role',true)<>'service_role' and not cms.can(p_site,'view',rec.content_type,rec.id) then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if not found then return null; end if;
 if jsonb_typeof(payload->'media') is distinct from 'array' then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',refs.id,'available',coalesce(
  m.inspection_status='ready' and m.rights_status='approved' and m.archived_at is null
  and (m.rights_expires_at is null or m.rights_expires_at>now()),false)) order by refs.id),'[]') into result
 from (select distinct item->>'assetId' id from jsonb_array_elements(payload->'media') item where jsonb_typeof(item->'assetId')='string') refs
 left join cms.media_objects m on m.website_id=p_site and m.id=refs.id;
 return result;
end $$;

create or replace function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('site',r.website_id,'record',r.id,'revision',v.id,'type',r.content_type,'path',r.path,'payload',v.payload,
  'mediaStatus',cms.get_record_media_status(p_site,p_record,p_revision))
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.current_revision_id
 where r.website_id=p_site and r.id=p_record and v.id=p_revision;
$$;

create function cms.enforce_published_media()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; asset text; media cms.media_objects;
begin
 if new.published_revision_id is null or new.published_revision_id is not distinct from old.published_revision_id then return new; end if;
 select v.payload into payload from cms.revisions v where v.id=new.published_revision_id and v.website_id=new.website_id and v.record_id=new.id;
 if new.content_type='journey' and payload ? 'media' then
  if jsonb_typeof(payload->'media')<>'array' then raise exception 'media_verification_required'; end if;
  for asset in select distinct item->>'assetId' from jsonb_array_elements(payload->'media') item order by 1 loop
   select * into media from cms.media_objects where website_id=new.website_id and id=asset for share;
   if not found or media.inspection_status<>'ready' or media.rights_status<>'approved' or media.archived_at is not null
    or (media.rights_expires_at is not null and media.rights_expires_at<=now()) then raise exception 'media_verification_required'; end if;
  end loop;
 end if;
 return new;
end $$;
create trigger cms_published_media_check before update of published_revision_id on cms.records for each row execute function cms.enforce_published_media();
revoke all on function cms.get_record_media_status(uuid,uuid,uuid),cms.enforce_published_media() from public;
grant execute on function cms.get_record_media_status(uuid,uuid,uuid) to authenticated,service_role;
commit;
