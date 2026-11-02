begin;
create table cms.enquiry_file_cleanup (
 website_id uuid not null,upload_id uuid not null,policy_version integer not null,policy jsonb not null,
 category text not null check(category in ('submitted','abandoned')),state text not null check(state in ('deleting','deleted')),
 attempts integer not null default 0,lease_token uuid,lease_until timestamptz,completed_token uuid,
 retry_after timestamptz not null default clock_timestamp(),last_error text,started_at timestamptz not null default clock_timestamp(),finished_at timestamptz,
 primary key(website_id,upload_id),foreign key(website_id,upload_id) references cms.enquiry_files(website_id,id),
 check((lease_token is null)=(lease_until is null)),check((state='deleted')=(finished_at is not null))
);
alter table cms.enquiry_file_cleanup enable row level security;
revoke all on cms.enquiry_file_cleanup from public,anon,authenticated,service_role;
-- Internal eligibility predicate. The extra hour exceeds the bounded transfer
-- and inspection requests, avoiding removal while an old write can still finish.
create function cms.enquiry_file_cleanup_category(p_site uuid,p_upload uuid)
returns text language sql stable security definer set search_path='' as $$
 select case when a.upload_id is null then 'abandoned' else 'submitted' end
 from cms.enquiry_files u join cms.enquiry_file_sessions s on s.website_id=u.website_id and s.id=u.session_id
 join cms.enquiry_file_retention p on p.website_id=u.website_id
 left join cms.lead_attachments a on a.website_id=u.website_id and a.upload_id=u.id
 left join cms.leads l on l.website_id=a.website_id and l.id=a.lead_id
 where u.website_id=p_site and u.id=p_upload and (p.policy->>'enabled')::boolean
 and s.expires_at+interval '1 hour'<=now() and (u.lease_until is null or u.lease_until+interval '1 hour'<=now())
 and ((a.upload_id is not null and l.created_at+make_interval(days=>(p.policy->>'submittedDays')::integer)<=now())
 or (a.upload_id is null and s.expires_at+make_interval(hours=>(p.policy->>'abandonedHours')::integer)<=now()));
$$;
create function cms.list_enquiry_file_cleanup(p_site uuid,p_limit integer default 5)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if p_limit is null or p_limit not between 1 and 20 then raise exception 'invalid_cleanup_batch';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('site',q.website_id,'upload',q.id) order by q.created_at,q.id),'[]'::jsonb) from (
 select u.website_id,u.id,u.created_at from cms.enquiry_files u left join cms.enquiry_file_cleanup c on c.website_id=u.website_id and c.upload_id=u.id
 where u.website_id=p_site and ((c.upload_id is null and cms.enquiry_file_cleanup_category(p_site,u.id) is not null)
 or (c.state='deleting' and c.retry_after<=now() and (c.lease_until is null or c.lease_until<=now())))
 order by u.created_at,u.id limit p_limit)q);
end $$;
create function cms.claim_enquiry_file_cleanup(p_site uuid,p_upload uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare job cms.enquiry_file_cleanup;u cms.enquiry_files;s cms.enquiry_file_sessions;p cms.enquiry_file_retention;category text;token uuid:=gen_random_uuid();base text;
begin
 perform 1 from cms.websites where id=p_site for update;if not found then return null;end if;
 select * into job from cms.enquiry_file_cleanup where website_id=p_site and upload_id=p_upload for update;
 if found then
  if job.state='deleted' or job.retry_after>clock_timestamp() or job.lease_until>clock_timestamp() then return null;end if;
 else
  category:=cms.enquiry_file_cleanup_category(p_site,p_upload);if category is null then return null;end if;
  select * into p from cms.enquiry_file_retention where website_id=p_site;
  insert into cms.enquiry_file_cleanup(website_id,upload_id,policy_version,policy,category,state) values(p_site,p_upload,p.version,p.policy,category,'deleting');
  insert into cms.audit_events(website_id,action,details) values(p_site,'enquiry_file.cleanup_started',jsonb_build_object('uploadId',p_upload,'policyVersion',p.version,'category',category));
 end if;
 select * into u from cms.enquiry_files where website_id=p_site and id=p_upload;
 select * into s from cms.enquiry_file_sessions where website_id=p_site and id=u.session_id;
 update cms.enquiry_file_cleanup set attempts=attempts+1,lease_token=token,lease_until=clock_timestamp()+interval '5 minutes',last_error=null where website_id=p_site and upload_id=p_upload returning * into job;
 base:=p_site::text||'/enquiries/'||s.request_key::text||'/'||p_upload::text;
 return jsonb_build_object('site',p_site,'upload',p_upload,'request',s.request_key,'leaseToken',token,'policyVersion',job.policy_version,'category',job.category,'keys',jsonb_build_array(base||'/original',base||'/delivery.'||case when u.mime='application/pdf' then 'pdf' else 'webp' end));
end $$;
create function cms.finish_enquiry_file_cleanup(p_site uuid,p_upload uuid,p_token uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare job cms.enquiry_file_cleanup;lead uuid;
begin
 perform 1 from cms.websites where id=p_site for update;
 select * into job from cms.enquiry_file_cleanup where website_id=p_site and upload_id=p_upload for update;
 if not found then raise exception 'cleanup_lease_lost';end if;
 if job.state='deleted' and job.completed_token=p_token then return p_upload;end if;
 if p_token is null or job.lease_token is null or job.state<>'deleting' or job.lease_token is distinct from p_token or job.lease_until<=clock_timestamp() then raise exception 'cleanup_lease_lost';end if;
 update cms.enquiry_file_cleanup set state='deleted',finished_at=clock_timestamp(),completed_token=p_token,lease_token=null,lease_until=null,last_error=null where website_id=p_site and upload_id=p_upload;
 insert into cms.audit_events(website_id,action,details) values(p_site,'enquiry_file.cleanup_completed',jsonb_build_object('uploadId',p_upload,'policyVersion',job.policy_version,'category',job.category));
 select lead_id into lead from cms.lead_attachments where website_id=p_site and upload_id=p_upload;
 if lead is not null then insert into cms.lead_events(website_id,lead_id,action,details) values(p_site,lead,'attachment_deleted',jsonb_build_object('uploadId',p_upload,'policyVersion',job.policy_version));end if;
 return p_upload;
end $$;
create function cms.fail_enquiry_file_cleanup(p_site uuid,p_upload uuid,p_token uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from cms.websites where id=p_site for update;
 update cms.enquiry_file_cleanup set lease_token=null,lease_until=null,retry_after=clock_timestamp()+interval '1 minute',last_error='storage_unavailable'
 where website_id=p_site and upload_id=p_upload and state='deleting' and lease_token=p_token and lease_until>clock_timestamp();
 if not found then raise exception 'cleanup_lease_lost';end if;
end $$;
-- Once deletion is committed to, no new authorization can release the file,
-- including while physical removal is retrying. Exact submission receipts remain.
alter function cms.get_lead_attachment_download(uuid,uuid,uuid) rename to get_lead_attachment_download_before_cleanup;
revoke all on function cms.get_lead_attachment_download_before_cleanup(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function cms.get_lead_attachment_download(p_site uuid,p_lead uuid,p_upload uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if exists(select 1 from cms.enquiry_file_cleanup where website_id=p_site and upload_id=p_upload) then return null;end if;
 return cms.get_lead_attachment_download_before_cleanup(p_site,p_lead,p_upload);
end $$;
alter function cms.list_lead_attachments(uuid,uuid) rename to list_lead_attachments_before_cleanup;
revoke all on function cms.list_lead_attachments_before_cleanup(uuid,uuid) from public,anon,authenticated,service_role;
create function cms.list_lead_attachments(p_site uuid,p_lead uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb;
begin
 items:=cms.list_lead_attachments_before_cleanup(p_site,p_lead);if items is null then return null;end if;
 return (select coalesce(jsonb_agg(item||jsonb_build_object('availability',case when c.state='deleted' then 'deleted' when c.state='deleting' then 'deleting' else 'available' end,'canDownload',(item->>'canDownload')::boolean and c.upload_id is null)),'[]'::jsonb)
 from jsonb_array_elements(items) item left join cms.enquiry_file_cleanup c on c.website_id=p_site and c.upload_id=(item->>'uploadId')::uuid);
end $$;
revoke all on function cms.enquiry_file_cleanup_category(uuid,uuid),cms.list_enquiry_file_cleanup(uuid,integer),cms.claim_enquiry_file_cleanup(uuid,uuid),cms.finish_enquiry_file_cleanup(uuid,uuid,uuid),cms.fail_enquiry_file_cleanup(uuid,uuid,uuid),cms.get_lead_attachment_download(uuid,uuid,uuid),cms.list_lead_attachments(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function cms.list_enquiry_file_cleanup(uuid,integer),cms.claim_enquiry_file_cleanup(uuid,uuid),cms.finish_enquiry_file_cleanup(uuid,uuid,uuid),cms.fail_enquiry_file_cleanup(uuid,uuid,uuid) to service_role;
grant execute on function cms.get_lead_attachment_download(uuid,uuid,uuid),cms.list_lead_attachments(uuid,uuid) to authenticated;
create or replace function cms.preview_enquiry_file_retention(p_site uuid,p_version integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare settings jsonb;policy jsonb;items jsonb;total integer;
begin
 settings:=cms.get_enquiry_file_retention(p_site);
 if p_version is distinct from (settings->>'version')::integer then raise exception 'retention_conflict' using errcode='40001';end if;
 policy:=settings->'policy';
 select coalesce(jsonb_agg(to_jsonb(candidate)),'[]'::jsonb) into items from (
  select u.id,case when a.upload_id is null then 'abandoned' else 'submitted' end as category,u.bytes+coalesce((u.result->>'bytes')::bigint,0) as bytes
  from cms.enquiry_files u join cms.enquiry_file_sessions s on s.website_id=u.website_id and s.id=u.session_id
  left join cms.lead_attachments a on a.website_id=u.website_id and a.upload_id=u.id
  left join cms.leads l on l.website_id=a.website_id and l.id=a.lead_id
  where u.website_id=p_site and not exists(select 1 from cms.enquiry_file_cleanup c where c.website_id=u.website_id and c.upload_id=u.id) and s.expires_at+interval '1 hour'<=now() and (u.lease_until is null or u.lease_until+interval '1 hour'<=now())
  and ((a.upload_id is not null and l.created_at+make_interval(days=>(policy->>'submittedDays')::integer)<=now())
   or (a.upload_id is null and s.expires_at+make_interval(hours=>(policy->>'abandonedHours')::integer)<=now()))
  order by u.created_at,u.id limit 501
 ) candidate;
 total:=jsonb_array_length(items);
 return jsonb_build_object('websiteId',p_site,'version',p_version,'enabled',(policy->>'enabled')::boolean,'asOf',now(),'hasMore',total>500,
 'candidateCount',least(total,500),'submittedCount',(select count(*) from jsonb_array_elements(items) with ordinality e(value,n) where n<=500 and value->>'category'='submitted'),
 'abandonedCount',(select count(*) from jsonb_array_elements(items) with ordinality e(value,n) where n<=500 and value->>'category'='abandoned'),
 'plannedBytes',(select coalesce(sum((value->>'bytes')::bigint),0) from jsonb_array_elements(items) with ordinality e(value,n) where n<=500));
end $$;
commit;
