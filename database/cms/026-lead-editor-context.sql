begin;
create function cms.list_lead_assignees(p_site uuid,p_lead uuid,p_search text default '',p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not cms.can_lead(p_site,'view',p_lead) or not cms.can_lead(p_site,'edit',p_lead) or not exists(select 1 from cms.leads where website_id=p_site and id=p_lead) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_search is null or length(p_search)>200 then raise exception 'invalid_search'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email) order by u.id),'[]') into result from (
 select u.id,u.email from auth.users u join cms.memberships m on m.user_id=u.id and m.website_id=p_site
 where m.revoked_at is null and (m.expires_at is null or m.expires_at>now()) and (p_after is null or u.id>p_after)
 and (p_search='' or position(lower(p_search) in lower(coalesce(u.email,'')))>0)
 and exists(select 1 from cms.permissions p where p.website_id=m.website_id and p.role_id=m.role_id and p.content_type='lead' and p.action='view' and (p.record_id is null or p.record_id=p_lead)) order by u.id limit 50) u;
 return result;
end $$;
create function cms.get_lead_form_labels(p_site uuid,p_lead uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare payload jsonb;
begin
 if not cms.can_lead(p_site,'view',p_lead) then return null; end if;
 select v.payload into payload from cms.leads l join cms.revisions v on v.website_id=l.website_id and v.record_id=l.form_id and v.id=l.form_revision_id where l.website_id=p_site and l.id=p_lead;
 if payload is null or jsonb_typeof(payload->'fields')<>'array' then return null; end if;
 return jsonb_build_object('title',payload->>'title','fields',(select coalesce(jsonb_object_agg(f->>'id',f->>'label'),'{}') from jsonb_array_elements(payload->'fields') f where f ? 'id' and f ? 'label'));
end $$;
revoke all on function cms.list_lead_assignees(uuid,uuid,text,uuid),cms.get_lead_form_labels(uuid,uuid) from public;
grant execute on function cms.list_lead_assignees(uuid,uuid,text,uuid),cms.get_lead_form_labels(uuid,uuid) to authenticated;
commit;
