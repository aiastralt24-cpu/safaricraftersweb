begin;
-- Evidence can inspect an immutable published revision while a newer draft exists.
create or replace function cms.get_faq_validation_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;payload jsonb;refs jsonb;links jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='faq';
 if not found then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if not found then return null;end if;
 select coalesce(jsonb_agg(jsonb_build_object('type',t.kind,'recordId',ref->>'recordId','available',r.id is not null,'published',r.published_revision_id is not null,'locale',r.locale) order by t.kind,ref->>'recordId'),'[]') into refs
 from (values('pages','page'),('products','product'),('destinations','destination'),('documents','document')) t(key,kind)
 cross join lateral jsonb_array_elements(case when jsonb_typeof(payload#>array['relationships',t.key])='array' then payload#>array['relationships',t.key] else '[]'::jsonb end) ref
 left join cms.records r on r.website_id=p_site and r.id=(ref->>'recordId')::uuid and r.content_type=t.kind and r.id<>p_record;
 select coalesce(jsonb_agg(jsonb_build_object('href',href,'available',cms.tanzania_link_path(href) is not null and position('#' in href)=0 and (cms.tanzania_link_path(href)=rec.path or exists(select 1 from cms.navigation_public_paths where path=cms.tanzania_link_path(href)) or cms.concept_link_available(p_site,cms.tanzania_link_path(href),rec.locale))) order by href),'[]') into links
 from (select distinct value#>>'{}' href from jsonb_path_query(payload,'$.**.href') value where jsonb_typeof(value)='string' and (value#>>'{}' like '/%' or value#>>'{}' like '#%')) x;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'references',refs,'links',links);
exception when invalid_text_representation then return null;
end $$;
create function cms.faq_release_evidence_current(p_site uuid,p_record uuid,p_revision uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare r cms.records;payload jsonb;e jsonb;ref jsonb;doc jsonb;day text:=to_char(now() at time zone 'UTC','YYYY-MM-DD');review_date text;
begin
 select * into r from cms.records where website_id=p_site and id=p_record and content_type='faq' and path is null and locale='en';if not found then return false;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;if not found then return false;end if;
 if payload->>'schemaVersion' is distinct from '1' or jsonb_typeof(payload->'question') is distinct from 'string' or length(btrim(payload->>'question')) not between 1 and 200 or jsonb_typeof(payload->'answer') is distinct from 'array' or jsonb_array_length(payload->'answer') not between 1 and 200 then return false;end if;
 review_date:=payload->>'reviewOn';if review_date is null then return false;end if;
 if review_date<>'' and (review_date!~'^\d{4}-\d{2}-\d{2}$' or to_char(review_date::date,'YYYY-MM-DD')<>review_date or review_date<day) then return false;end if;
 if jsonb_typeof(payload->'relationships') is distinct from 'object' or jsonb_typeof(payload#>'{relationships,products}') is distinct from 'array' or jsonb_array_length(payload#>'{relationships,products}')<>0 then return false;end if;
 e:=cms.get_faq_validation_evidence(p_site,p_record,p_revision);if e is null then return false;end if;
 if exists(select 1 from jsonb_array_elements(e->'references') x where x->>'available' is distinct from 'true' or x->>'published' is distinct from 'true' or x->>'locale' is distinct from r.locale)
 or exists(select 1 from jsonb_array_elements(e->'links') x where x->>'available' is distinct from 'true') then return false;end if;
 for ref in select value from jsonb_array_elements(payload#>'{relationships,documents}') loop
  doc:=cms.get_document_download(p_site,(ref->>'recordId')::uuid);if doc is null or doc->>'access' is distinct from 'public' then return false;end if;
 end loop;
 return true;
exception when invalid_text_representation or invalid_parameter_value or datetime_field_overflow or invalid_datetime_format then return false;
end $$;
create function cms.get_public_faq(p_site uuid,p_record uuid,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r cms.records;v cms.revisions;
begin
 if p_locale is distinct from 'en' then return null;end if;
 select * into r from cms.records where website_id=p_site and id=p_record and content_type='faq' and locale=p_locale and published_revision_id is not null and path is null;if not found then return null;end if;
 select * into v from cms.revisions where website_id=p_site and record_id=r.id and id=r.published_revision_id;if not found then return null;end if;
 if not exists(select 1 from cms.validations checked join cms.validation_policy policy on policy.content_type='faq' and policy.validator_version=checked.validator_version where checked.revision_id=v.id and checked.valid and checked.validator_version='faq-1') or not cms.faq_release_evidence_current(p_site,r.id,v.id) then return null;end if;
 return jsonb_build_object('recordId',r.id,'revisionId',v.id,'locale',r.locale,'question',v.payload->'question','answer',v.payload->'answer');
end $$;
revoke all on function cms.faq_release_evidence_current(uuid,uuid,uuid),cms.get_public_faq(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function cms.get_public_faq(uuid,uuid,text) to anon,authenticated,service_role;
-- Publication remains fenced until editor review controls and consumer integration land.
commit;
