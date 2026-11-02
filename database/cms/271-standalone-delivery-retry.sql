begin;
create or replace function cms.list_delivery_monitor(p_site uuid,p_after uuid default null,p_filter text default 'attention',p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb; more boolean;
begin
 if p_limit is null or p_limit not between 1 and 20 or p_filter is null or p_filter not in ('attention','failed','retry_pending','pending','running','delivered','superseded','all') then raise exception 'invalid_delivery_filter';end if;
 with assessed as materialized (
  select j.id,j.record_id,j.revision_id,j.operation,j.attempts,j.created_at,r.internal_title,r.locale,
  (j.status='failed' and j.attempts>=8 and (j.lease_until is null or j.lease_until<=now()) and cms.can(p_site,'publish',r.content_type,r.id) and not exists(select 1 from cms.publication_releases pr where pr.website_id=p_site and exists(select 1 from jsonb_array_elements(coalesce(pr.result->'items','[]'::jsonb)) x where x->>'deliveryJob'=j.id::text))) retry_allowed,
  case when j.status='superseded' or (j.operation='publish' and r.published_revision_id is distinct from j.revision_id) or (j.operation='unpublish' and r.published_revision_id is not null) then 'superseded'
   when j.status='succeeded' then 'delivered'
   when j.status='failed' or (j.status='running' and j.lease_until<=now()) then case when j.attempts>=8 then 'failed' else 'retry_pending' end
   else j.status end state
  from cms.delivery_jobs j join cms.records r on r.website_id=j.website_id and r.id=j.record_id
  where j.website_id=p_site and (p_after is null or j.id>p_after) and cms.can(p_site,'view',r.content_type,r.id)
 ), visible as materialized (
  select * from assessed where p_filter='all' or state=p_filter or (p_filter='attention' and state in ('failed','retry_pending')) order by id limit p_limit+1
 ) select coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'record',v.record_id,'revision',v.revision_id,'title',v.internal_title,'locale',v.locale,'operation',v.operation,'status',v.state,'attempts',v.attempts,'createdAt',v.created_at,'canRetry',v.retry_allowed and v.state='failed') order by v.id)
  from (select * from visible order by id limit p_limit) v),'[]'::jsonb),(select count(*)>p_limit from visible) into items,more;
 return jsonb_build_object('websiteId',p_site,'filter',p_filter,'checkedAt',now(),'items',items,'nextCursor',case when more then items->-1->>'id' else null end);
end $$;
revoke all on function cms.list_delivery_monitor(uuid,uuid,text,integer) from public;
grant execute on function cms.list_delivery_monitor(uuid,uuid,text,integer) to authenticated;
create function cms.retry_standalone_delivery(p_site uuid,p_job uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare job cms.delivery_jobs; rec cms.records; target uuid;
begin
 select record_id into target from cms.delivery_jobs where website_id=p_site and id=p_job;
 select * into rec from cms.records where website_id=p_site and id=target for update;
 if not found or not cms.can(p_site,'view',rec.content_type,rec.id) or not cms.can(p_site,'publish',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501';end if;
 select * into job from cms.delivery_jobs where website_id=p_site and id=p_job and record_id=rec.id for update;
 if not found then raise exception 'forbidden' using errcode='42501';end if;
 if job.status<>'failed' or job.attempts<8 or job.lease_until>now()
  or (job.operation='publish' and rec.published_revision_id is distinct from job.revision_id)
  or (job.operation='unpublish' and rec.published_revision_id is not null)
  or exists(select 1 from cms.publication_releases pr where pr.website_id=p_site and exists(select 1 from jsonb_array_elements(coalesce(pr.result->'items','[]'::jsonb)) x where x->>'deliveryJob'=p_job::text)) then
  return jsonb_build_object('site',p_site,'job',p_job,'status','not_eligible');
 end if;
 update cms.delivery_jobs set status='pending',attempts=0,next_attempt_at=now(),lease_token=null,lease_until=null,finished_at=null,last_error=null where id=p_job;
 insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
 values(p_site,auth.uid(),'delivery.retry_requested',job.record_id,job.revision_id,jsonb_build_object('deliveryJobId',job.id,'previousAttempts',job.attempts,'operation',job.operation));
 return jsonb_build_object('site',p_site,'job',p_job,'status','queued');
end $$;
revoke all on function cms.retry_standalone_delivery(uuid,uuid) from public;
grant execute on function cms.retry_standalone_delivery(uuid,uuid) to authenticated;
commit;
