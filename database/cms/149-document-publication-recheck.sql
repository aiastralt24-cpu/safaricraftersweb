begin;
create function cms.check_document_publication() returns trigger
language plpgsql security definer set search_path='' as $$
declare body jsonb; file_id uuid; product record; expected integer; found_count integer:=0;
 today date:=(now() at time zone 'UTC')::date; effective date; expiry date;
begin
 if new.content_type<>'document' or new.published_revision_id is null
  or new.published_revision_id is not distinct from old.published_revision_id then return new; end if;
 select payload into body from cms.revisions where website_id=new.website_id and record_id=new.id and id=new.published_revision_id;
 if not found or new.path is not null or body->>'language' is distinct from new.locale
  or body->>'schemaVersion' is distinct from '1' then raise exception 'document_publication_verification_required'; end if;
 -- The ordinary publish procedure enforces approval and current validation.
 -- Keep this last-moment dependency check independent of stale worker evidence.
 select f.id into file_id from cms.document_files f join cms.uploads u on u.website_id=f.website_id and u.id=f.id
 where f.website_id=new.website_id and f.id::text=lower(body #>> '{file,assetId}')
  and f.archived_at is null and f.rights_status='approved' and (f.rights_expires_at is null or f.rights_expires_at>now())
  and u.status='ready' and u.mime_type='application/pdf' and u.inspection_version='document-pdf-1'
  and f.inspection_version=u.inspection_version and f.original_sha256=u.original_sha256
 for share of f,u;
 if not found then raise exception 'document_publication_verification_required'; end if;
 if body->>'access' is null or body->>'access' not in ('public','authenticated')
  or body->>'expiryPolicy' is null or body->>'expiryPolicy' not in ('warn','blockPublication','removeAvailability')
  or jsonb_typeof(body->'products') is distinct from 'array' or jsonb_typeof(body->'categories') is distinct from 'array'
  then raise exception 'document_publication_verification_required'; end if;
 if jsonb_array_length(body->'categories')<>0 or jsonb_array_length(body->'products')>100 then raise exception 'document_publication_verification_required'; end if;
 expected:=jsonb_array_length(body->'products');
 -- Ordered record locks keep selected product identity/language stable through
 -- publication. Association alone does not require a published product.
 for product in select r.id from cms.records r where r.website_id=new.website_id and r.content_type='product' and r.locale=new.locale
  and r.id::text in(select lower(item->>'recordId') from jsonb_array_elements(body->'products') item)
  order by r.id for share loop found_count:=found_count+1; end loop;
 if found_count<>expected then raise exception 'document_publication_verification_required'; end if;
 if body ? 'effectiveOn' then
  if (body->>'effectiveOn') is null or (body->>'effectiveOn') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'document_publication_verification_required'; end if;
  effective:=(body->>'effectiveOn')::date;
  if effective>today then raise exception 'document_publication_verification_required'; end if;
 end if;
 if body ? 'expiresOn' then
  if (body->>'expiresOn') is null or (body->>'expiresOn') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'document_publication_verification_required'; end if;
  expiry:=(body->>'expiresOn')::date;
  if expiry<effective or (expiry<today and body->>'expiryPolicy'<>'warn') then raise exception 'document_publication_verification_required'; end if;
 end if;
 return new;
 exception when invalid_datetime_format or datetime_field_overflow then raise exception 'document_publication_verification_required';
end $$;
revoke all on function cms.check_document_publication() from public;
create trigger cms_document_publication_recheck before update of published_revision_id on cms.records
 for each row execute function cms.check_document_publication();
create or replace function cms.enforce_published_media()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; asset text; media cms.media_objects;
begin
 if new.published_revision_id is null or new.published_revision_id is not distinct from old.published_revision_id then return new; end if;
 select v.payload into payload from cms.revisions v where v.id=new.published_revision_id and v.website_id=new.website_id and v.record_id=new.id;
 -- The top-level PDF is checked by cms_document_publication_recheck. Any
 -- other nested assets retain the existing image media checks.
 if new.content_type='document' then payload:=payload-'file'; end if;
 if new.content_type='journey' and payload ? 'media' and jsonb_typeof(payload->'media') is distinct from 'array' then raise exception 'media_verification_required'; end if;
 if exists(select 1 from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)<>'string') then raise exception 'media_verification_required'; end if;
 for asset in select distinct value #>> '{}' from jsonb_path_query(payload,'$.**.assetId') value order by 1 loop
  select * into media from cms.media_objects where website_id=new.website_id and id=asset for share;
  if not found or media.mime_type='video/mp4' or media.inspection_status<>'ready' or media.rights_status<>'approved' or media.archived_at is not null
   or (new.content_type in ('destination','journalArticle','settings','photoExpedition','specialist','page','homepage') and media.mime_type<>'image/webp')
   or (media.rights_expires_at is not null and media.rights_expires_at<=now()) then raise exception 'media_verification_required'; end if;
 end loop;
 -- Retain the journey contract's handling of malformed entries without asset IDs.
 if new.content_type='journey' and not cms.journey_media_available(new.website_id,payload) then raise exception 'media_verification_required'; end if;

 return new;
end $$;
commit;
