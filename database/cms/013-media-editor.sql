begin;
alter table cms.media_objects add column revision bigint not null default 1,
 add column title text not null default '',add column description text not null default '',
 add column default_alt text not null default '',add column caption text not null default '',
 add column folder text not null default '',add column tags text[] not null default '{}';
create function cms.bump_media_revision() returns trigger language plpgsql set search_path='' as $$
begin new.revision:=old.revision+1;return new;end $$;
create trigger cms_media_revision before update on cms.media_objects for each row execute function cms.bump_media_revision();

create function cms.get_media(p_site uuid,p_asset text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',m.id,'revision',m.revision,'title',m.title,'description',m.description,'alt',m.default_alt,'caption',m.caption,'folder',m.folder,'tags',m.tags,
 'mime',m.mime_type,'bytes',m.byte_size,'width',m.width,'height',m.height,'inspectionStatus',m.inspection_status,
 'rightsStatus',m.rights_status,'rightsExpiresAt',m.rights_expires_at,'archivedAt',m.archived_at,
 'rightsEvidence',case when cms.can(p_site,'configure','document') then m.rights_evidence else null end,
 'canArchive',cms.can(p_site,'delete','document'),'canEdit',cms.can(p_site,'edit','document'),'canManageRights',cms.can(p_site,'configure','document'))
 from cms.media_objects m where m.website_id=p_site and m.id=p_asset and cms.can(p_site,'view','document');
$$;
create function cms.list_media(p_site uuid,p_after text default null,p_search text default '')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_search is null or length(p_search)>200 then raise exception 'invalid_media_search'; end if;
 select coalesce(jsonb_agg(cms.get_media(p_site,m.id) order by m.id),'[]') into result
 from (select id from cms.media_objects where website_id=p_site and cms.can(p_site,'view','document')
  and (p_after is null or id>p_after) and (p_search='' or position(lower(p_search) in lower(title||' '||description||' '||folder||' '||array_to_string(tags,' ')))>0)
  order by id limit 50) m;
 return result;
end $$;

create function cms.edit_media(p_site uuid,p_asset text,p_expected bigint,p_title text,p_description text,p_alt text,p_caption text,p_folder text,p_tags text[])
returns bigint language plpgsql security definer set search_path='' as $$
declare m cms.media_objects; result bigint;
begin
 if not cms.can(p_site,'edit','document') then raise exception 'forbidden' using errcode='42501'; end if;
 select * into m from cms.media_objects where website_id=p_site and id=p_asset for update;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 if m.revision is distinct from p_expected then raise exception 'revision_conflict' using errcode='40001'; end if;
 if p_title is null or length(trim(p_title)) not between 1 and 200 or p_description is null or length(p_description)>5000
  or p_alt is null or length(p_alt)>500 or p_caption is null or length(p_caption)>2000 or p_folder is null or length(p_folder)>200
  or p_tags is null or cardinality(p_tags)>50 or exists(select 1 from unnest(p_tags) t where t is null or length(trim(t)) not between 1 and 80) then raise exception 'invalid_media_metadata'; end if;
 update cms.media_objects set title=trim(p_title),description=p_description,default_alt=p_alt,caption=p_caption,folder=p_folder,tags=p_tags where website_id=p_site and id=p_asset returning revision into result;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'media.metadata_updated',jsonb_build_object('assetId',p_asset,'revision',result));
 return result;
end $$;

create function cms.set_media_rights(p_site uuid,p_asset text,p_expected bigint,p_status text,p_evidence text,p_expires timestamptz)
returns bigint language plpgsql security definer set search_path='' as $$
declare m cms.media_objects; result bigint;
begin
 if not cms.can(p_site,'configure','document') then raise exception 'forbidden' using errcode='42501'; end if;
 select * into m from cms.media_objects where website_id=p_site and id=p_asset for update;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 if m.revision is distinct from p_expected then raise exception 'revision_conflict' using errcode='40001'; end if;
 if p_status is null or p_status not in ('pending','approved','revoked') or p_evidence is null or length(p_evidence)>5000
  or (p_status='approved' and (length(trim(p_evidence))=0 or (p_expires is not null and p_expires<=now()))) then raise exception 'invalid_media_rights'; end if;
 update cms.media_objects set rights_status=p_status,rights_evidence=p_evidence,rights_expires_at=p_expires where website_id=p_site and id=p_asset returning revision into result;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'media.rights_updated',jsonb_build_object('assetId',p_asset,'revision',result,'status',p_status,'expiresAt',p_expires));
 return result;
end $$;
revoke all on function cms.bump_media_revision(),cms.get_media(uuid,text),cms.list_media(uuid,text,text),cms.edit_media(uuid,text,bigint,text,text,text,text,text,text[]),cms.set_media_rights(uuid,text,bigint,text,text,timestamptz) from public;
grant execute on function cms.get_media(uuid,text),cms.list_media(uuid,text,text),cms.edit_media(uuid,text,bigint,text,text,text,text,text,text[]),cms.set_media_rights(uuid,text,bigint,text,text,timestamptz) to authenticated;
commit;
