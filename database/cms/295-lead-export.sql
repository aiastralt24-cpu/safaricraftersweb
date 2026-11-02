begin;
create function cms.export_leads(p_site uuid,p_status text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare row cms.leads; item jsonb; items jsonb:='[]'; total_bytes integer:=0; total integer:=0; exported_at timestamptz:=now();
begin
 if not cms.mfa_allows(p_site,'export') or not exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
 where m.website_id=p_site and m.user_id=auth.uid() and m.revoked_at is null and (m.expires_at is null or m.expires_at>now()) and p.content_type='lead' and p.action='export') then raise exception 'forbidden' using errcode='42501';end if;
 if p_status is not null and p_status not in('new','assigned','contacted','qualified','in_progress','won','lost','invalid') then raise exception 'invalid_lead_status';end if;
 for row in select l.* from cms.leads l where l.website_id=p_site and (p_status is null or l.status=p_status)
 and cms.can_lead(p_site,'view',l.id) and cms.can_lead(p_site,'export',l.id) order by l.id limit 1001 loop
  total:=total+1;if total>1000 then raise exception 'lead_export_too_large';end if;
  item:=jsonb_build_object('id',row.id,'formId',row.form_id,'formRevisionId',row.form_revision_id,'form',cms.get_lead_form_labels(p_site,row.id),
   'answers',row.answers,'consents',row.consents,'attribution',row.attribution,'status',row.status,'priority',row.priority,'assignedTo',row.assigned_to,
   'nextFollowUp',row.next_follow_up,'outcome',row.outcome,'externalCrmReference',row.external_crm_reference,'version',row.version,'createdAt',row.created_at,'updatedAt',row.updated_at,
   'isMerged',cms.lead_is_merged(p_site,row.id),'mergedInto',(select m.target_id from cms.lead_merges m where m.website_id=p_site and m.source_id=row.id and cms.can_lead(p_site,'view',m.target_id) and cms.can_lead(p_site,'export',m.target_id)));
  total_bytes:=total_bytes+octet_length(item::text);if total_bytes>9000000 then raise exception 'lead_export_too_large';end if;
  items:=items||jsonb_build_array(item);
 end loop;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'leads.exported',jsonb_build_object('status',p_status,'count',total,'format','cms-leads-1'));
 return jsonb_build_object('format','cms-leads-1','websiteId',p_site,'actorId',auth.uid(),'exportedAt',exported_at,'status',p_status,'count',total,'records',items);
end $$;
revoke all on function cms.export_leads(uuid,text) from public;
grant execute on function cms.export_leads(uuid,text) to authenticated;
commit;
