begin;
-- Read only the exact submitted revision. No current draft/published fallback.
create or replace function cms.get_lead_form_labels(p_site uuid,p_lead uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare payload jsonb;
begin
 if not cms.can_lead(p_site,'view',p_lead) then return null; end if;
 select v.payload into payload from cms.leads l join cms.revisions v on v.website_id=l.website_id and v.record_id=l.form_id and v.id=l.form_revision_id where l.website_id=p_site and l.id=p_lead;
 if payload is null or jsonb_typeof(payload->'fields') is distinct from 'array' then return null; end if;
 return jsonb_build_object('title',payload->>'title',
 'fields',(select coalesce(jsonb_object_agg(f->>'id',f->>'label'),'{}') from jsonb_array_elements(payload->'fields') f where f ? 'id' and f ? 'label'),
 'options',(select coalesce(jsonb_object_agg(f->>'id',
  (select coalesce(jsonb_object_agg(o->>'id',o->>'label'),'{}') from jsonb_array_elements(case when jsonb_typeof(f->'options')='array' then f->'options' else '[]'::jsonb end) o where jsonb_typeof(o->'id')='string' and jsonb_typeof(o->'label')='string')
 ),'{}') from jsonb_array_elements(payload->'fields') f where jsonb_typeof(f->'id')='string' and f->>'type' in ('select','multiselect','productInterest','enquiryType')));
end $$;
revoke all on function cms.get_lead_form_labels(uuid,uuid) from public;
grant execute on function cms.get_lead_form_labels(uuid,uuid) to authenticated;
commit;
