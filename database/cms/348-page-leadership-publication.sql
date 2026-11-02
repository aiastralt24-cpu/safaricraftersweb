begin;
create function cms.enforce_page_leadership_publication()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;section jsonb;ref jsonb;ids uuid[];all_ids uuid[]:='{}';
begin
 if new.content_type<>'page' or new.published_revision_id is null then return new;end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.locale is not distinct from old.locale and new.path is not distinct from old.path then return new;end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 for section in select value from jsonb_array_elements(coalesce(payload#>'{composition,sections}','[]')) where value->>'kind'='reusableLeadership' and coalesce(value#>>'{controls,visible}','true')='true' loop
  if new.locale is distinct from 'en' or not cms.is_custom_page_path(new.path) then raise exception 'leadership_page_route_not_ready';end if;
  if jsonb_typeof(section#>'{data,records}') is distinct from 'array' or jsonb_array_length(section#>'{data,records}') not between 1 and 30 then raise exception 'invalid_page_leadership_selection';end if;
  ids:='{}';
  for ref in select value from jsonb_array_elements(section#>'{data,records}') loop
   if ref->>'recordId' is null then raise exception 'invalid_page_leadership_selection';end if;
   if (ref->>'recordId')::uuid=any(ids) then raise exception 'duplicate_page_leadership';end if;
   ids:=array_append(ids,(ref->>'recordId')::uuid);
   if not (ref->>'recordId')::uuid=any(all_ids) then all_ids:=array_append(all_ids,(ref->>'recordId')::uuid);end if;
  end loop;
 end loop;
 if cardinality(all_ids)=0 then return new;end if;
 if cardinality(all_ids)>30 then raise exception 'invalid_page_leadership_selection';end if;
 perform 1 from cms.records where website_id=new.website_id and id=any(all_ids) order by id for share;
 for ref in select to_jsonb(id) from unnest(all_ids) id loop
  if cms.get_public_leadership_reference(new.website_id,(ref#>>'{}')::uuid,new.locale) is null then raise exception 'page_leadership_unavailable';end if;
 end loop;
 return new;
end $$;
revoke all on function cms.enforce_page_leadership_publication() from public,anon,authenticated,service_role;
create trigger cms_page_leadership_publication before insert or update of published_revision_id,content_type,path,locale on cms.records for each row execute function cms.enforce_page_leadership_publication();
create function cms.get_page_leadership_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;payload jsonb;refs jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='page' and current_revision_id=p_revision;
 if not found then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if not exists(select 1 from jsonb_array_elements(coalesce(payload#>'{composition,sections}','[]')) section where section->>'kind'='reusableLeadership' and coalesce(section#>>'{controls,visible}','true')='true') then
  return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'references','[]'::jsonb);
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('recordId',id,'available',cms.get_public_leadership_reference(p_site,id,rec.locale) is not null) order by id),'[]') into refs
 from (select distinct (ref->>'recordId')::uuid id from jsonb_array_elements(coalesce(payload#>'{composition,sections}','[]')) section
 cross join lateral jsonb_array_elements(case when jsonb_typeof(section#>'{data,records}')='array' then section#>'{data,records}' else '[]'::jsonb end) ref
 where section->>'kind'='reusableLeadership' and coalesce(section#>>'{controls,visible}','true')='true') selected;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'references',refs);
exception when invalid_text_representation then return null;
end $$;
revoke all on function cms.get_page_leadership_evidence(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_page_leadership_evidence(uuid,uuid,uuid) to service_role;
-- Extend the current validation boundary without adding another nested wrapper.
create or replace function cms.get_validation_input(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare value jsonb;
begin
 value:=cms.get_validation_input_before_leadership(p_site,p_record,p_revision);
 if value->>'type'='leadership' then value:=value||jsonb_build_object('leadershipEvidence',cms.get_leadership_validation_evidence(p_site,p_record,p_revision));end if;
 if value->>'type'='page' then value:=value||jsonb_build_object('pageLeadershipEvidence',cms.get_page_leadership_evidence(p_site,p_record,p_revision));end if;
 return value;
end $$;
revoke all on function cms.get_validation_input(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_validation_input(uuid,uuid,uuid) to service_role;
commit;
