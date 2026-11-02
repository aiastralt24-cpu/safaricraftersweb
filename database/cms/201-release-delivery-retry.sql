begin;
create function cms.retry_release_delivery(p_site uuid,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare receipt cms.publication_releases; rec cms.records; job cms.delivery_jobs; item jsonb; retried integer:=0; checked integer:=0;
begin
 select * into receipt from cms.publication_releases where website_id=p_site and request_id=p_request;
 if not found or receipt.result is null or receipt.cancelled_at is not null then raise exception 'release_unavailable'; end if;
 -- Freeze current publication pointers while authorizing the whole release.
 for rec in select * from cms.records where website_id=p_site and id in(select (value->>'record')::uuid from jsonb_array_elements(receipt.items)) order by id for update loop
  if not cms.can(p_site,'publish',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
  checked:=checked+1;
 end loop;
 if checked<>jsonb_array_length(receipt.items) then raise exception 'forbidden' using errcode='42501'; end if;
 for item in select value from jsonb_array_elements(receipt.result->'items') order by value->>'deliveryJob' loop
  select * into job from cms.delivery_jobs where website_id=p_site and id=(item->>'deliveryJob')::uuid and record_id=(item->>'record')::uuid and revision_id=(item->>'revision')::uuid and operation='publish' for update;
  if not found then raise exception 'release_delivery_unavailable'; end if;
  -- Never steal leases, retry superseded content or duplicate automatic retries.
  if job.status<>'failed' or job.attempts<8 then continue; end if;
  if not exists(select 1 from cms.records where website_id=p_site and id=job.record_id and published_revision_id=job.revision_id) then continue; end if;
  update cms.delivery_jobs set status='pending',attempts=0,next_attempt_at=now(),lease_token=null,lease_until=null,finished_at=null,last_error=null where id=job.id;
  insert into cms.audit_events(website_id,actor_id,action,record_id,revision_id,details)
  values(p_site,auth.uid(),'delivery.retry_requested',job.record_id,job.revision_id,jsonb_build_object('releaseId',receipt.id,'deliveryJobId',job.id,'previousAttempts',job.attempts));
  retried:=retried+1;
 end loop;
 return jsonb_build_object('site',p_site,'request',p_request,'retried',retried);
end $$;
revoke all on function cms.retry_release_delivery(uuid,uuid) from public;
grant execute on function cms.retry_release_delivery(uuid,uuid) to authenticated;
commit;
