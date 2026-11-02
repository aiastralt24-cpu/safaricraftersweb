begin;
-- Private aliases point to record identity, never another alias, so delivery has no chains.
create table cms.page_redirects (
 website_id uuid not null,locale text not null,source_path text not null,
 record_id uuid not null,proposal_id uuid not null references cms.page_url_proposals(id),created_at timestamptz not null default now(),
 primary key(website_id,locale,source_path),foreign key(website_id,record_id) references cms.records(website_id,id),
 check(cms.is_custom_page_path(source_path))
);
alter table cms.page_redirects enable row level security;
revoke all on cms.page_redirects from public,anon,authenticated;
create function cms.lock_page_route(p_site uuid,p_locale text,p_path text)
returns void language sql volatile set search_path='' as $$
 select pg_advisory_xact_lock(hashtextextended(p_site::text||':'||p_locale||':'||p_path,0));
$$;
create function cms.enforce_record_redirect_ownership()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.path is null then return new; end if;
 perform cms.lock_page_route(new.website_id,new.locale,new.path);
 if exists(select 1 from cms.page_redirects where website_id=new.website_id and locale=new.locale and source_path=new.path) then raise exception 'route_reserved_by_redirect'; end if;
 return new;
end $$;
create trigger cms_record_redirect_ownership before insert or update of path,locale,website_id on cms.records for each row execute function cms.enforce_record_redirect_ownership();
create function cms.enforce_page_redirect_ownership()
returns trigger language plpgsql security definer set search_path='' as $$
declare target cms.records; proposal cms.page_url_proposals;
begin
 perform cms.lock_page_route(new.website_id,new.locale,new.source_path);
 if exists(select 1 from cms.records where website_id=new.website_id and locale=new.locale and path=new.source_path) then raise exception 'redirect_source_occupied'; end if;
 select * into target from cms.records where website_id=new.website_id and id=new.record_id;
 select * into proposal from cms.page_url_proposals where website_id=new.website_id and id=new.proposal_id and record_id=new.record_id;
 if target.id is null or target.content_type<>'page' or target.locale<>new.locale or not cms.is_custom_page_path(target.path)
  or proposal.id is null or proposal.new_path<>target.path or proposal.redirect_choice<>'permanent' or proposal.status<>'approved' or proposal.old_path<>new.source_path or proposal.locale<>new.locale
 then raise exception 'invalid_page_redirect'; end if;
 return new;
end $$;
create trigger cms_page_redirect_ownership before insert or update on cms.page_redirects for each row execute function cms.enforce_page_redirect_ownership();
create function cms.get_public_page_redirect(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('from',alias.source_path,'to',target.path,'status',308)
 from cms.page_redirects alias join cms.records target on target.website_id=alias.website_id and target.id=alias.record_id
 where alias.website_id=p_site and alias.locale=p_locale and alias.source_path=p_path and target.locale=p_locale and p_locale='en'
  and target.content_type='page' and target.published_revision_id is not null and cms.is_custom_page_path(target.path) and target.path<>alias.source_path;
$$;
revoke all on function cms.lock_page_route(uuid,text,text),cms.enforce_record_redirect_ownership(),cms.enforce_page_redirect_ownership(),cms.get_public_page_redirect(uuid,text,text) from public;
grant execute on function cms.get_public_page_redirect(uuid,text,text) to anon,authenticated;
create or replace function cms.page_url_impact_snapshot(p_site uuid,p_record uuid,p_path text)
returns text language sql stable security definer set search_path='' as $$
 select md5(jsonb_build_object('record',r.id,'revision',r.current_revision_id,'published',r.published_revision_id,'oldPath',r.path,'locale',r.locale,'newPath',p_path,
  'occupant',(select id from cms.records where website_id=p_site and locale=r.locale and path=p_path and id<>p_record),
  'redirectOccupant',(select record_id from cms.page_redirects where website_id=p_site and locale=r.locale and source_path=p_path),
  'references',(select coalesce(jsonb_agg(jsonb_build_array(s.id,s.current_revision_id,s.published_revision_id) order by s.id),'[]'::jsonb)
   from cms.records s left join cms.revisions d on d.id=s.current_revision_id left join cms.revisions p on p.id=s.published_revision_id
   where s.website_id=p_site and (cms.payload_links_path(d.payload,r.path) or cms.payload_links_path(p.payload,r.path) or cms.payload_references_record(d.payload,p_record) or cms.payload_references_record(p.payload,p_record))))::text)
 from cms.records r where r.website_id=p_site and r.id=p_record;
$$;

create or replace function cms.review_page_url(p_site uuid,p_record uuid,p_revision uuid,p_path text,p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 result:=cms.review_page_url_v224(p_site,p_record,p_revision,p_path,p_after);
 if result->>'status'='eligible' and exists(select 1 from cms.page_redirects where website_id=p_site and locale=result->>'locale' and source_path=p_path) then result:=jsonb_set(result,'{status}','"occupied"'); end if;
 return result||jsonb_build_object('snapshot',cms.page_url_impact_snapshot(p_site,p_record,p_path));
end $$;
commit;
