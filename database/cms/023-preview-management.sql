begin;
create function cms.list_preview_recipients(p_site uuid,p_record uuid,p_search text default '',p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; result jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found or not cms.can(p_site,'view',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_search is null or length(p_search)>200 then raise exception 'invalid_search'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email) order by u.id),'[]') into result from (
  select u.id,u.email from auth.users u join cms.memberships m on m.user_id=u.id and m.website_id=p_site
  where m.revoked_at is null and (m.expires_at is null or m.expires_at>now()) and (p_after is null or u.id>p_after)
  and (p_search='' or position(lower(p_search) in lower(coalesce(u.email,'')))>0)
  and exists(select 1 from cms.permissions p where p.website_id=m.website_id and p.role_id=m.role_id and p.action='view'
   and p.content_type in ('*',rec.content_type) and (p.record_id is null or p.record_id=rec.id)) order by u.id limit 50
 ) u;
 return result;
end $$;
create function cms.list_my_previews(p_site uuid,p_record uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; result jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found or not cms.can(p_site,'view',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('previewId',s.id,'revisionId',s.revision_id,'recipientId',s.recipient_id,'email',u.email,'expiresAt',s.expires_at) order by s.created_at desc),'[]') into result
 from (select * from cms.preview_sessions where website_id=p_site and record_id=p_record and created_by=auth.uid() and revoked_at is null and expires_at>now() order by created_at desc limit 100) s
 left join auth.users u on u.id=s.recipient_id;
 return result;
end $$;
revoke all on function cms.list_preview_recipients(uuid,uuid,text,uuid),cms.list_my_previews(uuid,uuid) from public;
grant execute on function cms.list_preview_recipients(uuid,uuid,text,uuid),cms.list_my_previews(uuid,uuid) to authenticated;
commit;
