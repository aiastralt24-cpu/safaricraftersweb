begin;
create function cms.list_enquiry_file_work(p_site uuid,p_limit integer default 5)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare jobs jsonb;
begin
 if p_site is null or p_limit is null or p_limit not between 1 and 20 then raise exception 'invalid_attachment_batch';end if;
 select coalesce(jsonb_agg(jsonb_build_object('site',u.website_id,'form',u.form_id,'revision',u.form_revision_id,'request',u.request_key,'field',u.field_id,'id',u.id) order by u.created_at,u.id),'[]'::jsonb) into jobs from(
  select f.website_id,s.form_id,s.form_revision_id,s.request_key,f.field_id,f.id,f.created_at
  from cms.enquiry_files f join cms.enquiry_file_sessions s on s.website_id=f.website_id and s.id=f.session_id
  join cms.records r on r.website_id=s.website_id and r.id=s.form_id and r.content_type='form' and r.published_revision_id=s.form_revision_id
  where f.website_id=p_site and s.state='active' and s.created_at<=now() and s.expires_at>now() and (f.attempts<3 or f.state='processing')
  and (f.state in ('uploaded','retry') or (f.state='processing' and f.lease_until<=now()))
  and not exists(select 1 from cms.leads l where l.website_id=s.website_id and l.request_key=s.request_key)
  and cms.get_enquiry_input(s.website_id,s.form_id,s.form_revision_id,s.request_key) is not null
  order by f.created_at,f.id limit p_limit
 )u;
 return jobs;
end $$;
revoke all on function cms.list_enquiry_file_work(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function cms.list_enquiry_file_work(uuid,integer) to service_role;
commit;
