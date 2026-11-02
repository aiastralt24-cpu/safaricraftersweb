begin;
-- A merge consolidates the active workflow, not the underlying submissions.
-- Original answers, consent, attribution, notes and notifications stay attached
-- to their original lead. There is no implicit promotion of marketing consent.
create table cms.lead_merges (
 website_id uuid not null,source_id uuid not null,target_id uuid not null,
 actor_id uuid not null references auth.users(id),request_id uuid not null,
 source_version integer not null,target_version integer not null,
 created_at timestamptz not null default now(),
 primary key(website_id,source_id),unique(website_id,actor_id,request_id),
 foreign key(website_id,source_id) references cms.leads(website_id,id),
 foreign key(website_id,target_id) references cms.leads(website_id,id),
 check(source_id<>target_id),check(source_version>0 and target_version>0)
);
create index cms_lead_merge_targets on cms.lead_merges(website_id,target_id);
alter table cms.lead_merges enable row level security;

create function cms.lead_is_merged(p_site uuid,p_lead uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select cms.can_lead(p_site,'view',p_lead) and exists(select 1 from cms.lead_merges where website_id=p_site and source_id=p_lead);
$$;
create function cms.guard_merged_lead()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from cms.lead_merges where website_id=old.website_id and source_id=old.id) then raise exception 'lead_already_merged'; end if;
 return new;
end $$;
create trigger cms_merged_lead_readonly before update on cms.leads for each row execute function cms.guard_merged_lead();

create function cms.review_lead_merge(p_site uuid,p_source uuid,p_target uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare source cms.leads; target cms.leads; source_keys text[]; target_keys text[];
begin
 if p_source is null or p_target is null or p_source=p_target then raise exception 'invalid_lead_merge';end if;
 if not cms.can_lead(p_site,'view',p_source) or not cms.can_lead(p_site,'edit',p_source)
 or not cms.can_lead(p_site,'view',p_target) or not cms.can_lead(p_site,'edit',p_target) then raise exception 'forbidden' using errcode='42501';end if;
 select * into source from cms.leads where website_id=p_site and id=p_source;
 select * into target from cms.leads where website_id=p_site and id=p_target;
 if source.id is null or target.id is null then raise exception 'forbidden' using errcode='42501';end if;
 if exists(select 1 from cms.lead_merges where website_id=p_site and (source_id in(p_source,p_target) or target_id=p_source)) then raise exception 'lead_merge_relationship_conflict';end if;
 select cms.lead_email_keys(source.answers,payload) into source_keys from cms.revisions where website_id=p_site and record_id=source.form_id and id=source.form_revision_id;
 select cms.lead_email_keys(target.answers,payload) into target_keys from cms.revisions where website_id=p_site and record_id=target.form_id and id=target.form_revision_id;
 if not coalesce(source_keys && target_keys,false) then raise exception 'lead_merge_email_mismatch';end if;
 return jsonb_build_object('websiteId',p_site,'sourceId',p_source,'targetId',p_target,
 'sourceVersion',source.version,'targetVersion',target.version,'policy','retain_target_preserve_submissions',
 'source',cms.get_lead(p_site,p_source),'target',cms.get_lead(p_site,p_target),
 'sourceForm',cms.get_lead_form_labels(p_site,p_source),'targetForm',cms.get_lead_form_labels(p_site,p_target));
end $$;

create function cms.merge_leads(p_site uuid,p_source uuid,p_target uuid,p_source_version integer,p_target_version integer,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare existing cms.lead_merges; review jsonb;
begin
 if p_request is null or p_source_version is null or p_target_version is null or p_source_version<1 or p_target_version<1 or p_source=p_target then raise exception 'invalid_lead_merge';end if;
 if not cms.can_lead(p_site,'view',p_source) or not cms.can_lead(p_site,'edit',p_source)
 or not cms.can_lead(p_site,'view',p_target) or not cms.can_lead(p_site,'edit',p_target) then raise exception 'forbidden' using errcode='42501';end if;
 -- Stable lock order also serializes competing merges, edits and notes.
 perform 1 from cms.leads where website_id=p_site and id in(p_source,p_target) order by id for update;
 select * into existing from cms.lead_merges where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 if found then
  if existing.source_id is distinct from p_source or existing.target_id is distinct from p_target or existing.source_version is distinct from p_source_version or existing.target_version is distinct from p_target_version then raise exception 'idempotency_key_reused';end if;
  return jsonb_build_object('websiteId',p_site,'sourceId',p_source,'targetId',p_target,'requestId',p_request,'replayed',true);
 end if;
 review:=cms.review_lead_merge(p_site,p_source,p_target);
 if (review->>'sourceVersion')::integer is distinct from p_source_version or (review->>'targetVersion')::integer is distinct from p_target_version then raise exception 'lead_conflict' using errcode='40001';end if;
 -- Preserve all workflow fields too; only active queues suppress the source.
 update cms.leads set version=version+1,updated_at=now() where website_id=p_site and id in(p_source,p_target);
 insert into cms.lead_merges(website_id,source_id,target_id,actor_id,request_id,source_version,target_version)
 values(p_site,p_source,p_target,auth.uid(),p_request,p_source_version,p_target_version);
 insert into cms.lead_events(website_id,lead_id,actor_id,action,details)
 values(p_site,p_source,auth.uid(),'merged_into_active_enquiry','{"policy":"retain_target_preserve_submissions"}'),
 (p_site,p_target,auth.uid(),'duplicate_submission_linked','{"policy":"retain_target_preserve_submissions"}');
 return jsonb_build_object('websiteId',p_site,'sourceId',p_source,'targetId',p_target,'requestId',p_request,'replayed',false);
end $$;

-- The detail endpoint exposes only links the current user can view.
alter function cms.get_lead(uuid,uuid) rename to get_lead_before_merge;
revoke all on function cms.get_lead_before_merge(uuid,uuid) from public,authenticated,anon,service_role;
create function cms.get_lead(p_site uuid,p_lead uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; merged boolean;
begin
 if not cms.can_lead(p_site,'view',p_lead) then return null;end if;
 result:=cms.get_lead_before_merge(p_site,p_lead);if result is null then return null;end if;
 merged:=cms.lead_is_merged(p_site,p_lead);
 return result||jsonb_build_object('canEdit',not merged and cms.can_lead(p_site,'edit',p_lead),'isMerged',merged,
 'mergedInto',(select target_id from cms.lead_merges where website_id=p_site and source_id=p_lead and cms.can_lead(p_site,'view',target_id)),
 'mergedSources',(select coalesce(jsonb_agg(source_id order by source_id),'[]') from cms.lead_merges where website_id=p_site and target_id=p_lead and cms.can_lead(p_site,'view',source_id)));
end $$;
revoke all on function cms.lead_is_merged(uuid,uuid),cms.guard_merged_lead(),cms.review_lead_merge(uuid,uuid,uuid),cms.merge_leads(uuid,uuid,uuid,integer,integer,uuid),cms.get_lead(uuid,uuid) from public;
grant execute on function cms.lead_is_merged(uuid,uuid),cms.review_lead_merge(uuid,uuid,uuid),cms.merge_leads(uuid,uuid,uuid,integer,integer,uuid),cms.get_lead(uuid,uuid) to authenticated;
create or replace function cms.list_leads(p_site uuid,p_status text default null,p_after uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare cursor_time timestamptz; result jsonb;
begin
 if p_status is not null and p_status not in ('new','assigned','contacted','qualified','in_progress','won','lost','invalid') then raise exception 'invalid_lead_status'; end if;
 if p_after is not null then select created_at into cursor_time from cms.leads where website_id=p_site and id=p_after; if not found then raise exception 'invalid_lead_cursor'; end if; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'formId',l.form_id,'status',l.status,'priority',l.priority,'assignedTo',l.assigned_to,'nextFollowUp',l.next_follow_up,'createdAt',l.created_at,'version',l.version) order by l.created_at desc,l.id desc),'[]') into result
 from (select * from cms.leads where website_id=p_site and not cms.lead_is_merged(p_site,id) and (p_status is null or status=p_status) and (p_after is null or (created_at,id)<(cursor_time,p_after)) order by created_at desc,id desc limit 50) l;
 return result;
end $$;

create or replace function cms.list_lead_attention(p_site uuid,p_after uuid default null,p_filter text default 'attention',p_limit integer default 20)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare items jsonb; more boolean;
begin
 if p_limit is null or p_limit not between 1 and 20 or p_filter is null or p_filter not in ('attention','unassigned','overdue') then raise exception 'invalid_attention_filter';end if;
 with visible as materialized (
  select l.* from cms.leads l where website_id=p_site and not cms.lead_is_merged(p_site,id) and (p_after is null or id>p_after)
   and status not in ('won','lost','invalid')
   and ((p_filter in ('attention','unassigned') and assigned_to is null) or (p_filter in ('attention','overdue') and next_follow_up<now()))
  order by id limit p_limit+1
 ) select coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'status',v.status,'priority',v.priority,'version',v.version,
  'createdAt',v.created_at,'nextFollowUp',v.next_follow_up,'unassigned',v.assigned_to is null,'overdue',coalesce(v.next_follow_up<now(),false)) order by v.id)
  from (select * from visible order by id limit p_limit) v),'[]'::jsonb),(select count(*)>p_limit from visible) into items,more;
 return jsonb_build_object('websiteId',p_site,'filter',p_filter,'asOf',now(),'items',items,'nextCursor',case when more then items->-1->>'id' else null end);
end $$;

create or replace function cms.list_lead_duplicates(p_site uuid,p_lead uuid,p_after uuid default null,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare keys text[]; items jsonb; more boolean;
begin
 if p_limit is null or p_limit not between 1 and 20 then raise exception 'invalid_duplicate_limit'; end if;
 if not cms.can_lead(p_site,'view',p_lead) then return null; end if;
 select cms.lead_email_keys(l.answers,v.payload) into keys from cms.leads l join cms.revisions v
 on v.website_id=l.website_id and v.record_id=l.form_id and v.id=l.form_revision_id where l.website_id=p_site and l.id=p_lead;
 if not found then return null; end if;
 if cms.lead_is_merged(p_site,p_lead) then keys:='{}'::text[]; end if;
 with matches as materialized (
  select l.id,l.status,l.created_at,l.version from cms.leads l join cms.revisions v
  on v.website_id=l.website_id and v.record_id=l.form_id and v.id=l.form_revision_id
  where l.website_id=p_site and not cms.lead_is_merged(p_site,l.id) and l.id<>p_lead and (p_after is null or l.id>p_after)
  and cms.can_lead(p_site,'view',l.id) and cardinality(keys)>0
  and cms.lead_email_keys(l.answers,v.payload) && keys order by l.id limit p_limit+1
 ) select coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'status',m.status,'createdAt',m.created_at,'version',m.version,'reason','matching_email') order by m.id)
 from (select * from matches order by id limit p_limit) m),'[]'::jsonb),(select count(*)>p_limit from matches) into items,more;
 return jsonb_build_object('websiteId',p_site,'leadId',p_lead,'hasEmail',cardinality(keys)>0,'items',items,'nextCursor',case when more then items->-1->>'id' else null end);
end $$;
commit;
