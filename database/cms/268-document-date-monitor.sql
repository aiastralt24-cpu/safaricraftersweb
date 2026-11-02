begin;
create function cms.monitor_calendar_date(p_value text) returns date language plpgsql immutable set search_path='' as $$
declare result date;
begin
 if p_value is null or p_value !~ '^\d{4}-\d{2}-\d{2}$' then return null;end if;
 result:=p_value::date;if to_char(result,'YYYY-MM-DD')<>p_value then return null;end if;return result;
 exception when others then return null;
end $$;
revoke all on function cms.monitor_calendar_date(text) from public;
create function cms.list_document_date_monitor(p_site uuid,p_after uuid default null,p_scope text default 'published',p_filter text default 'attention',p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb; more boolean; today date:=(now() at time zone 'UTC')::date;
begin
 if p_limit is null or p_limit not between 1 and 20 or p_scope is null or p_scope not in ('published','draft') or p_filter is null or p_filter not in ('attention','expired','expiring','review','invalid','all') then raise exception 'invalid_monitor_query';end if;
 with candidates as materialized (
  select r.id,r.internal_title,r.locale,v.id revision,v.payload,
  cms.monitor_calendar_date(v.payload->>'expiresOn') expiry,cms.monitor_calendar_date(v.payload->>'reviewOn') review_date
  from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=case when p_scope='published' then r.published_revision_id else r.current_revision_id end
  where r.website_id=p_site and r.content_type='document' and (p_after is null or r.id>p_after) and cms.can(p_site,'view','document',r.id)
 ), assessed as (
  select *,coalesce(expiry<today,false) expired,coalesce(expiry between today and today+30,false) expiring,
  coalesce(review_date<today,false) review_overdue,
  ((payload ? 'expiresOn' and expiry is null) or (payload ? 'reviewOn' and review_date is null)) invalid_dates
  from candidates
 ), visible as materialized (
  select * from assessed where p_filter='all' or (p_filter='attention' and (expired or expiring or review_overdue or invalid_dates))
   or (p_filter='expired' and expired) or (p_filter='expiring' and expiring) or (p_filter='review' and review_overdue) or (p_filter='invalid' and invalid_dates)
  order by id limit p_limit+1
 ) select coalesce((select jsonb_agg(jsonb_build_object('record',v.id,'revision',v.revision,'title',v.internal_title,'locale',v.locale,
   'expiresOn',v.expiry,'reviewOn',v.review_date,'expired',v.expired,'expiring',v.expiring,'reviewOverdue',v.review_overdue,'invalidDates',v.invalid_dates,
   'expiryPolicy',case when v.payload->>'expiryPolicy' in ('warn','blockPublication','removeAvailability') then v.payload->>'expiryPolicy' else null end) order by v.id)
   from (select * from visible order by id limit p_limit) v),'[]'::jsonb),(select count(*)>p_limit from visible) into items,more;
 return jsonb_build_object('websiteId',p_site,'scope',p_scope,'filter',p_filter,'asOf',today,'items',items,'nextCursor',case when more then items->-1->>'record' else null end);
end $$;
revoke all on function cms.list_document_date_monitor(uuid,uuid,text,text,integer) from public;
grant execute on function cms.list_document_date_monitor(uuid,uuid,text,text,integer) to authenticated;
commit;
