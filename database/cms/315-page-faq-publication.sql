begin;
create function cms.enforce_page_faq_publication()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;section jsonb;ref jsonb;ids uuid[];
begin
 if new.content_type<>'page' or new.published_revision_id is null then return new;end if;
 if tg_op='UPDATE' and new.published_revision_id is not distinct from old.published_revision_id and new.locale is not distinct from old.locale and new.path is not distinct from old.path then return new;end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 for section in select value from jsonb_array_elements(coalesce(payload#>'{composition,sections}','[]')) where value->>'kind'='reusableFaq' and coalesce(value#>>'{controls,visible}','true')='true' loop
  if new.locale is distinct from 'en' then raise exception 'faq_page_language_not_ready';end if;
  if jsonb_typeof(section#>'{data,records}') is distinct from 'array' or jsonb_array_length(section#>'{data,records}') not between 1 and 50 then raise exception 'invalid_page_faq_selection';end if;
  ids:='{}';
  for ref in select value from jsonb_array_elements(section#>'{data,records}') loop
   if (ref->>'recordId')::uuid=any(ids) then raise exception 'duplicate_page_faq';end if;
   ids:=array_append(ids,(ref->>'recordId')::uuid);
   if cms.get_public_faq(new.website_id,(ref->>'recordId')::uuid,new.locale) is null then raise exception 'page_faq_unavailable';end if;
  end loop;
 end loop;
 return new;
end $$;
revoke all on function cms.enforce_page_faq_publication() from public,anon,authenticated,service_role;
create trigger cms_page_faq_publication before insert or update of published_revision_id,content_type,path,locale on cms.records for each row execute function cms.enforce_page_faq_publication();
commit;
