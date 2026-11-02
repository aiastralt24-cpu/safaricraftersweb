begin;
create or replace function cms.enforce_page_leadership_publication()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;section jsonb;ref jsonb;ids uuid[];all_ids uuid[]:='{}';
begin
 if new.content_type<>'page' or new.published_revision_id is null then return new;end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.locale is not distinct from old.locale and new.path is not distinct from old.path then return new;end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 for section in select value from jsonb_array_elements(coalesce(payload#>'{composition,sections}','[]')) where value->>'kind'='reusableLeadership' and coalesce(value#>>'{controls,visible}','true')='true' loop
  if new.locale is distinct from 'en' or (new.path is distinct from '/about' and not cms.is_custom_page_path(new.path)) then raise exception 'leadership_page_route_not_ready';end if;
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
commit;
