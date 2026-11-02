begin;
-- Eligibility now comes from the guarded published-form source.
create or replace function cms.get_contact_form_status(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('recordId',refs.id,'revisionId',published.value->>'revisionId','locale',published.value->>'locale',
  'available',coalesce(published.value is not null and published.value->>'locale'=parent.locale
    and published.value->'definition'->'schemaVersion'='1'::jsonb
    and jsonb_typeof(published.value->'definition'->'fields')='array'
    and not jsonb_path_exists(published.value,'$.definition.fields[*] ? (@.type == "file")'),false)) order by refs.id),'[]'::jsonb)
 from cms.records parent join cms.revisions v on v.website_id=parent.website_id and v.record_id=parent.id and v.id=p_revision
 cross join lateral (select distinct lower(section #>> '{data,form,recordId}') id
  from jsonb_array_elements(case when jsonb_typeof(v.payload->'composition'->'sections')='array' then v.payload->'composition'->'sections' else '[]'::jsonb end) section
  where section->>'kind'='contactEnquiry' and coalesce(section->'controls'->>'visible','true')<>'false'
    and section #>> '{data,form,recordId}' ~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$') refs
 cross join lateral (select cms.get_published_form(p_site,refs.id::uuid) value) published
 where parent.website_id=p_site and parent.id=p_record and parent.content_type='page' and parent.path='/contact';
$$;
create or replace function cms.enforce_contact_page_release()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb; section jsonb; refs uuid[]; item jsonb; form_id uuid;
begin
 if new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and old.content_type='page' and old.path='/contact' and old.published_revision_id is not null and (new.content_type is distinct from old.content_type or new.path is distinct from old.path or new.locale is distinct from old.locale) then raise exception 'contact_page_route_not_ready'; end if;
 if new.path is distinct from '/contact' then return new; end if;
 if new.content_type<>'page' or new.locale<>'en' then raise exception 'contact_page_route_not_ready'; end if;
 select v.payload into payload from cms.revisions v where v.website_id=new.website_id and v.record_id=new.id and v.id=new.published_revision_id;
 if payload is null or jsonb_typeof(payload) is distinct from 'object' or payload-'composition'-'seo'<>'{}'::jsonb or jsonb_typeof(payload->'composition'->'sections') is distinct from 'array' then raise exception 'contact_page_content_invalid'; end if;
 refs:='{}'::uuid[];
 for section in select value from jsonb_array_elements(payload->'composition'->'sections') loop
  if coalesce(section->'controls'->>'visible','true')<>'false' then
   if coalesce(section->>'kind','') not in ('contactIntro','contactEnquiry') then raise exception 'contact_page_section_unsupported'; end if;
   if coalesce(section->'controls'->'regions','[]'::jsonb)<>'[]'::jsonb then raise exception 'contact_page_region_unsupported'; end if;
   if section->>'kind'='contactEnquiry' then
    if coalesce(section #>> '{data,form,recordId}','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then raise exception 'contact_form_unavailable'; end if;
    refs:=array_append(refs,(section #>> '{data,form,recordId}')::uuid);
   end if;
  end if;
 end loop;
 if cardinality(refs)=0 then raise exception 'contact_form_unavailable'; end if;
 -- Deterministic row locks prevent referenced publication pointers changing
 -- between this eligibility check and the page publication transaction commit.
 perform r.id from cms.records r where r.website_id=new.website_id and r.id=any(refs) order by r.id for share;
 if (select count(*) from cms.records r where r.website_id=new.website_id and r.id=any(refs) and r.content_type='form' and r.locale=new.locale and r.published_revision_id is not null)<>(select count(distinct id) from unnest(refs) id) then raise exception 'contact_form_unavailable'; end if;
 -- Read the locked dependencies directly: a BEFORE trigger must not depend on
 -- the old parent route being visible to a separate evidence query.
 for form_id in select distinct id from unnest(refs) id loop
  item:=cms.get_published_form(new.website_id,form_id);
  if item is null or item->>'locale' is distinct from new.locale
   or item->'definition'->'schemaVersion' is distinct from '1'::jsonb
   or jsonb_typeof(item->'definition'->'fields') is distinct from 'array'
   or jsonb_path_exists(item,'$.definition.fields[*] ? (@.type == "file")')
   then raise exception 'contact_form_unavailable'; end if;
  perform cms.assert_form_notification_delivery(new.website_id,item->'definition');
 end loop;
 -- Full structure/schedules require the revision-bound trusted receipt.
 -- Existing media release triggers retain current rights and processing checks.
 return new;
end $$;
alter function cms.get_public_page(uuid,text,text) rename to get_public_page_before_contact_notifications;
revoke all on function cms.get_public_page_before_contact_notifications(uuid,text,text) from public,anon,authenticated,service_role;
create function cms.get_public_page(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare value jsonb;forms jsonb;
begin
 value:=cms.get_public_page_before_contact_notifications(p_site,p_path,p_locale);
 if value is not null and p_path='/contact' then
  forms:=cms.get_contact_form_status(p_site,(value->>'recordId')::uuid,(value->>'revisionId')::uuid);
  if forms is null or jsonb_array_length(forms)=0 or exists(select 1 from jsonb_array_elements(forms) f where f->>'available' is distinct from 'true') then return null;end if;
 end if;
 return value;
end $$;
revoke all on function cms.get_public_page(uuid,text,text) from public;
grant execute on function cms.get_public_page(uuid,text,text) to anon,authenticated,service_role;
commit;
