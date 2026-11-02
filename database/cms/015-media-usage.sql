begin;
create function cms.payload_uses_asset(p_payload jsonb,p_asset text)
returns boolean language sql immutable set search_path='' as $$
 select jsonb_path_exists(p_payload,'$.**.assetId ? (@ == $asset)',jsonb_build_object('asset',p_asset));
$$;
create function cms.media_usage(p_site uuid,p_asset text,p_after uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('recordId',r.id,'title',r.internal_title,'type',r.content_type,'path',r.path,
  'draft',cms.payload_uses_asset(d.payload,p_asset),'published',coalesce(cms.payload_uses_asset(p.payload,p_asset),false)) order by r.id),'[]')
 from (select r.* from cms.records r
  where r.website_id=p_site and (p_after is null or r.id>p_after) and cms.can(p_site,'view','document') and cms.can(p_site,'view',r.content_type,r.id)
   and exists(select 1 from cms.revisions v where v.website_id=p_site and v.record_id=r.id and v.id in (r.current_revision_id,r.published_revision_id) and cms.payload_uses_asset(v.payload,p_asset))
  order by r.id limit 50) r
 join cms.revisions d on d.id=r.current_revision_id left join cms.revisions p on p.id=r.published_revision_id;
$$;
create function cms.archive_media(p_site uuid,p_asset text,p_expected bigint,p_archive boolean)
returns bigint language plpgsql security definer set search_path='' as $$
declare m cms.media_objects; result bigint;
begin
 if not cms.can(p_site,'delete','document') then raise exception 'forbidden' using errcode='42501'; end if;
 select * into m from cms.media_objects where website_id=p_site and id=p_asset for update;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 if m.revision is distinct from p_expected then raise exception 'revision_conflict' using errcode='40001'; end if;
 if p_archive is null then raise exception 'invalid_archive_state'; end if;
 if p_archive and (
  exists(select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id in (r.current_revision_id,r.published_revision_id)
   where r.website_id=p_site and cms.payload_uses_asset(v.payload,p_asset))
  or exists(select 1 from cms.preview_sessions s join cms.revisions v on v.id=s.revision_id
   where s.website_id=p_site and s.revoked_at is null and s.expires_at>now() and cms.payload_uses_asset(v.payload,p_asset))
 ) then raise exception 'media_in_use'; end if;
 if (m.archived_at is not null)=p_archive then return m.revision; end if;
 update cms.media_objects set archived_at=case when p_archive then now() else null end where website_id=p_site and id=p_asset returning revision into result;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),case when p_archive then 'media.archived' else 'media.restored' end,jsonb_build_object('assetId',p_asset,'revision',result));
 return result;
end $$;

-- Coordinate new references with archiving: an archive holds the asset lock while
-- checking usage; a new revision/preview must hold a shared lock through commit.
create function cms.check_unarchived_references(p_site uuid,p_payload jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare asset text; archived timestamptz;
begin
 for asset in select distinct value #>> '{}' from jsonb_path_query(p_payload,'$.**.assetId') value where jsonb_typeof(value)='string' order by 1 loop
  select archived_at into archived from cms.media_objects where website_id=p_site and id=asset for share;
  if found and archived is not null then raise exception 'archived_media_reference'; end if;
 end loop;
end $$;
create function cms.check_revision_media() returns trigger language plpgsql security definer set search_path='' as $$
begin perform cms.check_unarchived_references(new.website_id,new.payload);return new;end $$;
create trigger cms_revision_media before insert on cms.revisions for each row execute function cms.check_revision_media();
create function cms.check_preview_media() returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;
begin select v.payload into payload from cms.revisions v where v.id=new.revision_id;perform cms.check_unarchived_references(new.website_id,payload);return new;end $$;
create trigger cms_preview_media before insert on cms.preview_sessions for each row execute function cms.check_preview_media();
revoke all on function cms.payload_uses_asset(jsonb,text),cms.media_usage(uuid,text,uuid),cms.archive_media(uuid,text,bigint,boolean),cms.check_unarchived_references(uuid,jsonb),cms.check_revision_media(),cms.check_preview_media() from public;
grant execute on function cms.media_usage(uuid,text,uuid),cms.archive_media(uuid,text,bigint,boolean) to authenticated;
commit;
