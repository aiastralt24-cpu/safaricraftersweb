begin;
create or replace function cms.prepare_translation_payload(p_type text,p_payload jsonb,p_source_locale text,p_locale text)
returns jsonb language plpgsql immutable set search_path='' as $$
declare payload jsonb:=p_payload;sections jsonb;
begin
 if p_type='document' then payload:=jsonb_set(payload-'file','{language}',to_jsonb(p_locale),true);end if;
 if p_type='testimonial' and payload ? 'verified' then payload:=jsonb_set(payload,'{verified}','false'::jsonb);end if;
 -- A language variant must not silently retain the source's explicit canonical.
 if jsonb_typeof(payload->'seo')='object' and (payload->'seo') ? 'canonical' then payload:=jsonb_set(payload,'{seo,canonical}','""'::jsonb);end if;
 if p_type in ('page','homepage') and jsonb_typeof(payload #> '{composition,sections}')='array' then
  select coalesce(jsonb_agg(case when jsonb_typeof(s.value #> '{controls,locales}')='array' and (s.value #> '{controls,locales}') ? p_source_locale then
   jsonb_set(s.value,'{controls,locales}',(select jsonb_agg(lang order by first_position) from (
    select case when x.value=to_jsonb(p_source_locale) then to_jsonb(p_locale) else x.value end lang,min(x.n) first_position
    from jsonb_array_elements(s.value #> '{controls,locales}') with ordinality x(value,n) group by 1
   ) mapped)) else s.value end order by s.n),'[]') into sections
  from jsonb_array_elements(payload #> '{composition,sections}') with ordinality s(value,n);
  payload:=jsonb_set(payload,'{composition,sections}',sections);
 end if;
 if p_type='navigation' and jsonb_typeof(payload->'items')='array' then
  select coalesce(jsonb_agg(case when jsonb_typeof(item.value #> '{visibility,locales}')='array' and (item.value #> '{visibility,locales}') ? p_source_locale then
   jsonb_set(item.value,'{visibility,locales}',(select jsonb_agg(lang order by first_position) from (
    select case when entry.value=to_jsonb(p_source_locale) then to_jsonb(p_locale) else entry.value end lang,min(entry.n) first_position
    from jsonb_array_elements(item.value #> '{visibility,locales}') with ordinality entry(value,n) group by 1
   ) mapped)) else item.value end order by item.n),'[]') into sections
  from jsonb_array_elements(payload->'items') with ordinality item(value,n);
  payload:=jsonb_set(payload,'{items}',sections);
 end if;
 return payload;
end $$;
revoke all on function cms.prepare_translation_payload(text,jsonb,text,text) from public;
commit;
