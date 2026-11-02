begin;
create function cms.list_public_expeditions(p_site uuid,p_locale text default 'en',p_after uuid default null,p_snapshot text default null,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; result jsonb; payload jsonb; cards jsonb:='[]'; card jsonb; fingerprint text; items jsonb; last_id uuid; more boolean;
begin
 if p_locale is distinct from 'en' or p_limit is null or p_limit not between 1 and 50 or (p_after is not null and p_snapshot is null) then raise exception 'invalid_directory_request'; end if;
 if p_snapshot is not null and p_snapshot !~ '^[a-f0-9]{32}$' then raise exception 'invalid_directory_snapshot'; end if;
 if (select count(*) from cms.records where website_id=p_site and content_type='photoExpedition' and locale=p_locale and published_revision_id is not null)>1000 then raise exception 'directory_limit_exceeded'; end if;
 for rec in select * from cms.records where website_id=p_site and content_type='photoExpedition' and locale=p_locale and published_revision_id is not null order by id loop
  result:=cms.get_public_expedition(p_site,rec.path,p_locale);if result is null then continue; end if;
  payload:=result->'page'->'payload';
  select jsonb_object_agg(key,value) into card from jsonb_each(payload) where key=any(array['slug','title','geography','programmeStatus','category','duration','description','price','dateLabel','image','departures','seo']);
  cards:=cards||jsonb_build_array(jsonb_build_object('websiteId',p_site,'recordId',rec.id,'revisionId',rec.published_revision_id,'locale',p_locale,'path',rec.path,'content',card));
  if octet_length(cards::text)>5000000 then raise exception 'directory_limit_exceeded'; end if;
 end loop;
 -- Change detector only, not an authorization token. Every request rechecks eligibility.
 fingerprint:=md5(cards::text);
 if p_snapshot is not null and p_snapshot<>fingerprint then raise exception 'directory_changed'; end if;
 if p_after is not null and not exists(select 1 from jsonb_array_elements(cards) c where c->>'recordId'=p_after::text) then raise exception 'invalid_directory_cursor'; end if;
 select coalesce(jsonb_agg(c order by c->>'recordId'),'[]'::jsonb) into items from (select value c from jsonb_array_elements(cards) where p_after is null or (value->>'recordId')::uuid>p_after order by value->>'recordId' limit p_limit) selected;
 last_id:=(items->-1->>'recordId')::uuid;
 more:=last_id is not null and exists(select 1 from jsonb_array_elements(cards) c where (c->>'recordId')::uuid>last_id);
 return jsonb_build_object('websiteId',p_site,'locale',p_locale,'snapshot',fingerprint,'items',items,'nextCursor',case when more then last_id else null end);
end $$;
revoke all on function cms.list_public_expeditions(uuid,text,uuid,text,integer) from public;
grant execute on function cms.list_public_expeditions(uuid,text,uuid,text,integer) to anon,authenticated;
commit;
