begin;
-- Pausing delivery never releases ownership of an old address.
create table cms.page_redirect_states (
 website_id uuid not null,locale text not null,source_path text not null,
 enabled boolean not null,version bigint not null check(version>0),updated_at timestamptz not null default now(),
 primary key(website_id,locale,source_path),
 foreign key(website_id,locale,source_path) references cms.page_redirects(website_id,locale,source_path)
);
create table cms.page_redirect_requests (
 website_id uuid not null,actor_id uuid not null references auth.users(id),request_id uuid not null,
 manifest jsonb not null,result jsonb not null,created_at timestamptz not null default now(),
 primary key(website_id,actor_id,request_id)
);
alter table cms.page_redirect_states enable row level security;
alter table cms.page_redirect_requests enable row level security;
revoke all on cms.page_redirect_states,cms.page_redirect_requests from public,anon,authenticated;
create or replace function cms.get_public_page_redirect(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('from',a.source_path,'to',r.path,'status',308)
 from cms.page_redirects a join cms.records r on r.website_id=a.website_id and r.id=a.record_id
 left join cms.page_redirect_states s on s.website_id=a.website_id and s.locale=a.locale and s.source_path=a.source_path
 where a.website_id=p_site and a.locale=p_locale and a.source_path=p_path and r.locale=p_locale and p_locale='en'
 and coalesce(s.enabled,true) and r.content_type='page' and r.published_revision_id is not null and cms.is_custom_page_path(r.path) and r.path<>a.source_path;
$$;
create function cms.list_page_redirects(p_site uuid,p_record uuid,p_after text default null,p_snapshot text default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; stamp text; items jsonb; cursor text;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found or rec.content_type<>'page' or not cms.can(p_site,'view','page',p_record) then raise exception 'forbidden' using errcode='42501'; end if;
 select md5(jsonb_build_object('path',rec.path,'published',rec.published_revision_id,'aliases',coalesce(jsonb_agg(jsonb_build_array(a.source_path,coalesce(s.enabled,true),coalesce(s.version,0)) order by a.source_path collate "C"),'[]'::jsonb))::text) into stamp
 from cms.page_redirects a left join cms.page_redirect_states s on s.website_id=a.website_id and s.locale=a.locale and s.source_path=a.source_path where a.website_id=p_site and a.record_id=p_record and a.locale=rec.locale;
 if p_after is not null and (p_snapshot is distinct from stamp or not exists(select 1 from cms.page_redirects where website_id=p_site and record_id=p_record and locale=rec.locale and source_path=p_after)) then raise exception 'redirect_list_changed' using errcode='40001'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('sourcePath',x.source_path,'enabled',x.enabled,'version',x.version) order by x.source_path collate "C"),'[]'::jsonb) into items from (
 select a.source_path,coalesce(s.enabled,true) enabled,coalesce(s.version,0) version from cms.page_redirects a left join cms.page_redirect_states s on s.website_id=a.website_id and s.locale=a.locale and s.source_path=a.source_path
 where a.website_id=p_site and a.record_id=p_record and a.locale=rec.locale and (p_after is null or a.source_path collate "C">p_after collate "C") order by a.source_path collate "C" limit 51) x;
 if jsonb_array_length(items)>50 then cursor:=items->49->>'sourcePath';items:=items-50;end if;
 return jsonb_build_object('site',p_site,'recordId',p_record,'path',rec.path,'locale',rec.locale,'published',rec.published_revision_id is not null,'items',items,'snapshot',stamp,'nextCursor',cursor);
end $$;
create function cms.set_page_redirect_enabled(p_site uuid,p_record uuid,p_source text,p_version bigint,p_enabled boolean,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec cms.records; current_version bigint; request jsonb; prior cms.page_redirect_requests; result jsonb; job uuid;
begin
 if p_request is null or p_version is null or p_version<0 or p_enabled is null or not coalesce(cms.is_custom_page_path(p_source),false) then raise exception 'invalid_redirect_change'; end if;
 perform 1 from cms.websites where id=p_site for update;
 select * into rec from cms.records where website_id=p_site and id=p_record for update;
 if not found or rec.content_type<>'page' or not cms.can(p_site,'view','page',p_record) or not cms.can(p_site,'publish','page',p_record) then raise exception 'forbidden' using errcode='42501'; end if;
 request:=jsonb_build_object('record',p_record,'source',p_source,'version',p_version,'enabled',p_enabled);
 select * into prior from cms.page_redirect_requests where website_id=p_site and actor_id=auth.uid() and request_id=p_request;
 if found then
  if prior.manifest<>request then raise exception 'redirect_request_mismatch'; end if;
  return prior.result;
 end if;
 perform 1 from cms.page_redirects where website_id=p_site and record_id=p_record and locale=rec.locale and source_path=p_source for share;
 if not found then raise exception 'redirect_not_found'; end if;
 select version into current_version from cms.page_redirect_states where website_id=p_site and locale=rec.locale and source_path=p_source for update;
 if coalesce(current_version,0)<>p_version then raise exception 'redirect_changed' using errcode='40001'; end if;
 insert into cms.page_redirect_states(website_id,locale,source_path,enabled,version) values(p_site,rec.locale,p_source,p_enabled,p_version+1)
 on conflict(website_id,locale,source_path) do update set enabled=excluded.enabled,version=excluded.version,updated_at=now();
 if rec.published_revision_id is not null then
  insert into cms.delivery_jobs(website_id,record_id,revision_id,operation) values(p_site,p_record,rec.published_revision_id,'publish') returning id into job;
 end if;
 result:=jsonb_build_object('site',p_site,'recordId',p_record,'sourcePath',p_source,'enabled',p_enabled,'version',p_version+1,'requestKey',p_request);
 insert into cms.page_redirect_requests(website_id,actor_id,request_id,manifest,result) values(p_site,auth.uid(),p_request,request,result);
 insert into cms.audit_events(website_id,actor_id,action,record_id,details) values(p_site,auth.uid(),'page.redirect_changed',p_record,jsonb_build_object('sourcePath',p_source,'enabled',p_enabled,'version',p_version+1,'deliveryJobId',job));
 return result;
end $$;
revoke all on function cms.list_page_redirects(uuid,uuid,text,text),cms.set_page_redirect_enabled(uuid,uuid,text,bigint,boolean,uuid) from public;
grant execute on function cms.list_page_redirects(uuid,uuid,text,text),cms.set_page_redirect_enabled(uuid,uuid,text,bigint,boolean,uuid) to authenticated;
commit;
