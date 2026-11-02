begin;
create function cms.get_enquiry_input(p_site uuid,p_form uuid,p_revision uuid,p_request uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('websiteId',r.website_id,'formId',r.id,'revisionId',v.id,'definition',v.payload)
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=p_revision
 where r.website_id=p_site and r.id=p_form and r.content_type='form' and (r.published_revision_id=p_revision or exists(select 1 from cms.leads l where l.website_id=p_site and l.request_key=p_request and l.form_id=p_form and l.form_revision_id=p_revision));
$$;
create table cms.enquiry_rate_windows (
 website_id uuid not null references cms.websites(id),actor_digest text not null check(actor_digest ~ '^[a-f0-9]{64}$'),window_start timestamptz not null,hits integer not null check(hits between 1 and 20),
 primary key(website_id,actor_digest,window_start)
);
alter table cms.enquiry_rate_windows enable row level security;
create function cms.consume_enquiry_rate(p_site uuid,p_actor_digest text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare bucket timestamptz:=to_timestamp(floor(extract(epoch from now())/600)*600); accepted integer;
begin
 if p_actor_digest is null or p_actor_digest !~ '^[a-f0-9]{64}$' then raise exception 'invalid_rate_identity'; end if;
 insert into cms.enquiry_rate_windows(website_id,actor_digest,window_start,hits) values(p_site,p_actor_digest,bucket,1)
 on conflict(website_id,actor_digest,window_start) do update set hits=cms.enquiry_rate_windows.hits+1 where cms.enquiry_rate_windows.hits<20 returning hits into accepted;
 return jsonb_build_object('allowed',accepted is not null,'retryAfter',greatest(1,ceil(extract(epoch from bucket+interval '10 minutes'-now()))::integer));
end $$;
create function cms.prune_enquiry_rate_windows()
returns integer language plpgsql security definer set search_path='' as $$
declare count integer;
begin
 delete from cms.enquiry_rate_windows where (website_id,actor_digest,window_start) in (select website_id,actor_digest,window_start from cms.enquiry_rate_windows where window_start<now()-interval '1 day' order by window_start limit 1000);
 get diagnostics count=row_count;return count;
end $$;
revoke all on function cms.get_enquiry_input(uuid,uuid,uuid,uuid),cms.consume_enquiry_rate(uuid,text),cms.prune_enquiry_rate_windows() from public;
grant execute on function cms.get_enquiry_input(uuid,uuid,uuid,uuid),cms.consume_enquiry_rate(uuid,text),cms.prune_enquiry_rate_windows() to service_role;
commit;
