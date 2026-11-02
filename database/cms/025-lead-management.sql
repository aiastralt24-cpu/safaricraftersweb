begin;
create function cms.list_leads(p_site uuid,p_status text default null,p_after uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare cursor_time timestamptz; result jsonb;
begin
 if p_status is not null and p_status not in ('new','assigned','contacted','qualified','in_progress','won','lost','invalid') then raise exception 'invalid_lead_status'; end if;
 if p_after is not null then select created_at into cursor_time from cms.leads where website_id=p_site and id=p_after; if not found then raise exception 'invalid_lead_cursor'; end if; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'formId',l.form_id,'status',l.status,'priority',l.priority,'assignedTo',l.assigned_to,'nextFollowUp',l.next_follow_up,'createdAt',l.created_at,'version',l.version) order by l.created_at desc,l.id desc),'[]') into result
 from (select * from cms.leads where website_id=p_site and (p_status is null or status=p_status) and (p_after is null or (created_at,id)<(cursor_time,p_after)) order by created_at desc,id desc limit 50) l;
 return result;
end $$;
create function cms.get_lead(p_site uuid,p_lead uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',l.id,'formId',l.form_id,'formRevision',l.form_revision_id,'answers',l.answers,'consents',l.consents,'attribution',l.attribution,'status',l.status,'priority',l.priority,'assignedTo',l.assigned_to,'nextFollowUp',l.next_follow_up,'outcome',l.outcome,'externalCrmReference',l.external_crm_reference,'version',l.version,'createdAt',l.created_at,'updatedAt',l.updated_at,'canEdit',cms.can_lead(p_site,'edit',l.id),
 'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc,e.id desc),'[]') from (select id,actor_id,action,details,created_at from cms.lead_events where website_id=p_site and lead_id=p_lead order by created_at desc,id desc limit 100) e),
 'notifications',(select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'status',j.status,'attempts',j.attempts,'errorCode',j.last_error_code)),'[]') from cms.lead_notification_jobs j where j.website_id=p_site and j.lead_id=p_lead))
 from cms.leads l where l.website_id=p_site and l.id=p_lead;
$$;
create function cms.update_lead(p_site uuid,p_lead uuid,p_expected integer,p_status text,p_priority text,p_assigned uuid,p_follow_up timestamptz,p_outcome text,p_crm text)
returns integer language plpgsql security definer set search_path='' as $$
declare old cms.leads;
begin
 if not cms.can_lead(p_site,'view',p_lead) or not cms.can_lead(p_site,'edit',p_lead) then raise exception 'forbidden' using errcode='42501'; end if;
 select * into old from cms.leads where website_id=p_site and id=p_lead for update;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 if old.version is distinct from p_expected then raise exception 'lead_conflict' using errcode='40001'; end if;
 if p_status is null or p_status not in ('new','assigned','contacted','qualified','in_progress','won','lost','invalid') or p_priority is null or p_priority not in ('low','normal','high') or p_outcome is null or length(p_outcome)>5000 or length(p_crm)>500 then raise exception 'invalid_lead_update'; end if;
 if p_assigned is not null and not exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id where m.website_id=p_site and m.user_id=p_assigned and m.revoked_at is null and (m.expires_at is null or m.expires_at>now()) and p.content_type='lead' and p.action='view' and (p.record_id is null or p.record_id=p_lead)) then raise exception 'invalid_lead_assignee'; end if;
 if p_status='assigned' and p_assigned is null then raise exception 'lead_owner_required'; end if;
 update cms.leads set status=p_status,priority=p_priority,assigned_to=p_assigned,next_follow_up=p_follow_up,outcome=p_outcome,external_crm_reference=p_crm,version=version+1,updated_at=now() where id=p_lead;
 insert into cms.lead_events(website_id,lead_id,actor_id,action,details) values(p_site,p_lead,auth.uid(),'updated',jsonb_build_object('before',jsonb_build_object('status',old.status,'priority',old.priority,'assignedTo',old.assigned_to,'nextFollowUp',old.next_follow_up,'outcome',old.outcome,'externalCrmReference',old.external_crm_reference),'after',jsonb_build_object('status',p_status,'priority',p_priority,'assignedTo',p_assigned,'nextFollowUp',p_follow_up,'outcome',p_outcome,'externalCrmReference',p_crm)));
 return old.version+1;
end $$;
create function cms.add_lead_note(p_site uuid,p_lead uuid,p_expected integer,p_note text)
returns integer language plpgsql security definer set search_path='' as $$
declare old cms.leads;
begin
 if not cms.can_lead(p_site,'view',p_lead) or not cms.can_lead(p_site,'edit',p_lead) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_note is null or length(trim(p_note))=0 or length(p_note)>5000 then raise exception 'invalid_lead_note'; end if;
 select * into old from cms.leads where website_id=p_site and id=p_lead for update;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 if old.version is distinct from p_expected then raise exception 'lead_conflict' using errcode='40001'; end if;
 insert into cms.lead_events(website_id,lead_id,actor_id,action,details) values(p_site,p_lead,auth.uid(),'note_added',jsonb_build_object('note',p_note));
 update cms.leads set version=version+1,updated_at=now() where id=p_lead;
 return old.version+1;
end $$;
revoke all on function cms.list_leads(uuid,text,uuid),cms.get_lead(uuid,uuid),cms.update_lead(uuid,uuid,integer,text,text,uuid,timestamptz,text,text),cms.add_lead_note(uuid,uuid,integer,text) from public;
grant execute on function cms.list_leads(uuid,text,uuid),cms.get_lead(uuid,uuid),cms.update_lead(uuid,uuid,integer,text,text,uuid,timestamptz,text,text),cms.add_lead_note(uuid,uuid,integer,text) to authenticated;
commit;
