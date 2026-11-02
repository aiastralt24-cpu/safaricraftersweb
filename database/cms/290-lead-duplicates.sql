begin;
-- Only typed email fields from the submitted form revision participate. Never
-- infer contact identity from arbitrary answer keys, notes or current forms.
create function cms.lead_email_keys(p_answers jsonb,p_form jsonb)
returns text[] language sql immutable set search_path='' as $$
 select coalesce(array_agg(distinct lower(btrim(p_answers->>(f->>'id')))),'{}'::text[])
 from jsonb_array_elements(case when jsonb_typeof(p_form->'fields')='array' then p_form->'fields' else '[]'::jsonb end) f
 where f->>'type'='email' and jsonb_typeof(p_answers->(f->>'id'))='string'
 and length(btrim(p_answers->>(f->>'id'))) between 3 and 320
 and btrim(p_answers->>(f->>'id')) ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$';
$$;
create function cms.list_lead_duplicates(p_site uuid,p_lead uuid,p_after uuid default null,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare keys text[]; items jsonb; more boolean;
begin
 if p_limit is null or p_limit not between 1 and 20 then raise exception 'invalid_duplicate_limit'; end if;
 if not cms.can_lead(p_site,'view',p_lead) then return null; end if;
 select cms.lead_email_keys(l.answers,v.payload) into keys from cms.leads l join cms.revisions v
 on v.website_id=l.website_id and v.record_id=l.form_id and v.id=l.form_revision_id where l.website_id=p_site and l.id=p_lead;
 if not found then return null; end if;
 with matches as materialized (
  select l.id,l.status,l.created_at,l.version from cms.leads l join cms.revisions v
  on v.website_id=l.website_id and v.record_id=l.form_id and v.id=l.form_revision_id
  where l.website_id=p_site and l.id<>p_lead and (p_after is null or l.id>p_after)
  and cms.can_lead(p_site,'view',l.id) and cardinality(keys)>0
  and cms.lead_email_keys(l.answers,v.payload) && keys order by l.id limit p_limit+1
 ) select coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'status',m.status,'createdAt',m.created_at,'version',m.version,'reason','matching_email') order by m.id)
 from (select * from matches order by id limit p_limit) m),'[]'::jsonb),(select count(*)>p_limit from matches) into items,more;
 return jsonb_build_object('websiteId',p_site,'leadId',p_lead,'hasEmail',cardinality(keys)>0,'items',items,'nextCursor',case when more then items->-1->>'id' else null end);
end $$;
revoke all on function cms.lead_email_keys(jsonb,jsonb),cms.list_lead_duplicates(uuid,uuid,uuid,integer) from public;
grant execute on function cms.list_lead_duplicates(uuid,uuid,uuid,integer) to authenticated;
commit;
