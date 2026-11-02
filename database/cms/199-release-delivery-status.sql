begin;
create function cms.get_release_delivery_status(p_site uuid,p_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare receipt cms.publication_releases; rec cms.records; item jsonb; job cms.delivery_jobs; items jsonb:='[]'; state text;
begin
 select * into receipt from cms.publication_releases where website_id=p_site and request_id=p_request;
 if not found then return null; end if;
 -- A release is an indivisible disclosure: never expose members the caller cannot view.
 for item in select value from jsonb_array_elements(receipt.items) loop
  select * into rec from cms.records where website_id=p_site and id=(item->>'record')::uuid;
  if not found or not cms.can(p_site,'view',rec.content_type,rec.id) then return null; end if;
 end loop;
 if receipt.cancelled_at is not null then return jsonb_build_object('site',p_site,'request',p_request,'release',receipt.id,'status','cancelled','items','[]'::jsonb); end if;
 if receipt.result is null then return null; end if;
 for item in select value from jsonb_array_elements(receipt.result->'items') loop
  select * into job from cms.delivery_jobs where website_id=p_site and id=(item->>'deliveryJob')::uuid and record_id=(item->>'record')::uuid and revision_id=(item->>'revision')::uuid and operation='publish';
  if not found then raise exception 'release_delivery_unavailable'; end if;
  select * into rec from cms.records where website_id=p_site and id=job.record_id;
  state:=case when rec.published_revision_id is distinct from job.revision_id or job.status='superseded' then 'superseded'
   when job.status='succeeded' then 'delivered'
   when job.status='failed' and job.attempts>=8 then 'failed'
   when job.status='failed' then 'retry_pending'
   when job.status='running' and job.lease_until<=now() and job.attempts>=8 then 'failed'
   when job.status='running' and job.lease_until<=now() then 'retry_pending'
   else job.status end;
  items:=items||jsonb_build_array(jsonb_build_object('record',job.record_id,'revision',job.revision_id,'deliveryJob',job.id,'status',state,'attempts',job.attempts));
 end loop;
 return jsonb_build_object('site',p_site,'request',p_request,'release',receipt.id,'status','committed','items',items);
end $$;
revoke all on function cms.get_release_delivery_status(uuid,uuid) from public;
grant execute on function cms.get_release_delivery_status(uuid,uuid) to authenticated;
commit;
