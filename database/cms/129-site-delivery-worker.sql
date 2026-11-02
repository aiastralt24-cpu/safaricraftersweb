begin;
create function cms.claim_site_delivery(p_site uuid,p_limit integer default 10,p_lease_seconds integer default 60)
returns jsonb language plpgsql security definer set search_path='' as $$
declare job cms.delivery_jobs; rec cms.records; result jsonb := '[]'; token uuid;
begin
 if p_limit is null or p_limit not between 1 and 50 or p_lease_seconds is null or p_lease_seconds not between 15 and 300 then raise exception 'invalid_lease_options'; end if;
 for job in select * from cms.delivery_jobs
  where website_id=p_site and attempts<8 and ((status in ('pending','failed') and next_attempt_at<=now()) or (status='running' and lease_until<=now()))
  order by next_attempt_at,created_at,id for update skip locked limit p_limit loop
  select * into rec from cms.records where website_id=job.website_id and id=job.record_id;
  if (job.operation='publish' and rec.published_revision_id is distinct from job.revision_id)
   or (job.operation='unpublish' and rec.published_revision_id is not null) then
   update cms.delivery_jobs set status='superseded',finished_at=now(),lease_until=null,lease_token=null where id=job.id;
   continue;
  end if;
  token:=gen_random_uuid();
  update cms.delivery_jobs set status='running',attempts=attempts+1,lease_until=now()+make_interval(secs=>p_lease_seconds),lease_token=token,last_error=null where id=job.id;
  result:=result||jsonb_build_array(jsonb_build_object('id',job.id,'websiteId',job.website_id,'recordId',job.record_id,'revisionId',job.revision_id,
   'operation',job.operation,'path',rec.path,'locale',rec.locale,'contentType',rec.content_type,'leaseToken',token,'attempt',job.attempts+1));
 end loop;
 return result;
end $$;

create function cms.reap_site_delivery(p_site uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare count integer;
begin
 update cms.delivery_jobs set status='failed',finished_at=now(),lease_until=null,lease_token=null,last_error='worker_lease_expired'
 where website_id=p_site and status='running' and attempts>=8 and lease_until<=now();
 get diagnostics count=row_count;
 return count;
end $$;
revoke all on function cms.claim_site_delivery(uuid,integer,integer),cms.reap_site_delivery(uuid) from public;
grant execute on function cms.claim_site_delivery(uuid,integer,integer),cms.reap_site_delivery(uuid) to service_role;
commit;
