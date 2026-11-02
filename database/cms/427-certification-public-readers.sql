begin;
create or replace function cms.certification_claim_owner_eligible(p_site uuid,p_record uuid,p_revision uuid,p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=p_revision
 join cms.websites w on w.id=r.website_id join cms.memberships m on m.website_id=r.website_id and m.user_id=p_user
 where r.website_id=p_site and r.id=p_record and r.content_type='certification' and (r.current_revision_id=p_revision or r.published_revision_id=p_revision)
 and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())
 and (not w.separate_approver or v.created_by<>p_user)
 and not exists(select 1 from unnest(array['view','approve']) a(action) where not exists(
 select 1 from cms.permissions p where p.website_id=m.website_id and p.role_id=m.role_id and p.action=a.action
 and p.content_type in('*','certification') and (p.record_id is null or p.record_id=p_record))));
$$;
create or replace function cms.certification_claim_snapshot(p_site uuid,p_record uuid,p_revision uuid,p_claim uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare payload jsonb; claim jsonb; ref jsonb; doc cms.records; v cms.revisions; f jsonb; evidence jsonb:='[]'; day text:=to_char(now() at time zone 'UTC','YYYY-MM-DD');d text;
begin
 select r.payload into payload from cms.records p join cms.revisions r on r.website_id=p.website_id and r.record_id=p.id and r.id=p_revision where p.website_id=p_site and p.id=p_record and p.content_type='certification' and (p.current_revision_id=p_revision or p.published_revision_id=p_revision);
 if payload is null or jsonb_typeof(jsonb_build_array(payload||jsonb_build_object('id',p_record))) is distinct from 'array' then return null;end if;
 if (select count(*) from jsonb_array_elements(jsonb_build_array(payload||jsonb_build_object('id',p_record))) c where c->>'id'=p_claim::text)<>1 then return null;end if;
 select c into claim from jsonb_array_elements(jsonb_build_array(payload||jsonb_build_object('id',p_record))) c where c->>'id'=p_claim::text;
 if jsonb_typeof(claim->'statement') is distinct from 'string' or length(btrim(claim->>'statement')) not between 1 and 2000 or jsonb_typeof(claim->'evidence') is distinct from 'array' then return null;end if;
 d:=claim->>'reviewOn';if d is null or d!~'^\d{4}-\d{2}-\d{2}$' or to_char(d::date,'YYYY-MM-DD')<>d or d<=day then return null;end if;
 -- A certification's single claim uses the record identity, with all material
 -- issuer, scope and validity fields pinned in the approval snapshot.
 if claim->>'status' is distinct from 'active' or claim->>'validity' not in ('dated','noExpiry') or claim->>'validity' is null then return null;end if;
 foreach d in array array['issuer','scope','title'] loop
  if jsonb_typeof(claim->d) is distinct from 'string' or length(btrim(claim->>d))<1 then return null;end if;
 end loop;
 foreach d in array array[claim->>'issuedOn',claim->>'validFrom'] loop
  if d is null or d!~'^\d{4}-\d{2}-\d{2}$' or to_char(d::date,'YYYY-MM-DD')<>d then return null;end if;
 end loop;
 if claim->>'validFrom'<claim->>'issuedOn' or claim->>'validFrom'>day then return null;end if;
 d:=claim->>'expiresOn';
 if claim->>'validity'='dated' then
  if d is null or d!~'^\d{4}-\d{2}-\d{2}$' or to_char(d::date,'YYYY-MM-DD')<>d or d<day or d<claim->>'validFrom' then return null;end if;
 elsif d is distinct from '' then return null;end if;
 if jsonb_array_length(claim->'evidence') not between 1 and 30 or exists(select 1 from jsonb_array_elements(claim->'evidence') x group by lower(x->>'recordId') having count(*)>1) then return null;end if;
 for ref in select value from jsonb_array_elements(claim->'evidence') order by value->>'recordId' loop
  select * into doc from cms.records where website_id=p_site and id=(ref->>'recordId')::uuid and content_type='document';
  if doc.id is null or doc.current_revision_id is null then return null;end if;
  select * into v from cms.revisions where website_id=p_site and record_id=doc.id and id=doc.current_revision_id;
  foreach d in array array[v.payload->>'effectiveOn',v.payload->>'expiresOn',v.payload->>'reviewOn'] loop
   if d is not null and (d!~'^\d{4}-\d{2}-\d{2}$' or to_char(d::date,'YYYY-MM-DD')<>d) then return null;end if;
  end loop;
  if v.payload->>'effectiveOn'>day or v.payload->>'expiresOn'<day or v.payload->>'reviewOn'<day then return null;end if;
  f:=cms.get_document_validation_status(p_site,doc.id,v.id)->'file';
  if f is null or not coalesce((f->>'processed')::boolean,false) or not coalesce((f->>'rightsApproved')::boolean,false) or not coalesce((f->>'rightsCurrent')::boolean,false) or coalesce((f->>'archived')::boolean,true) or f->>'revision' is null then return null;end if;
  evidence:=evidence||jsonb_build_array(jsonb_build_object('recordId',doc.id,'revisionId',v.id,'title',coalesce(v.payload->>'title',doc.internal_title),'assetId',f->>'assetId','fileRevision',(f->>'revision')::bigint));
 end loop;
 return jsonb_build_object('statement',claim->>'statement','reviewOn',claim->>'reviewOn','issuer',claim->>'issuer','certificateNumber',claim->>'certificateNumber','scope',claim->>'scope','issuedOn',claim->>'issuedOn','validFrom',claim->>'validFrom','validity',claim->>'validity','expiresOn',claim->>'expiresOn','evidence',evidence);
exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format then return null;
end $$;
create function cms.get_certification_revision_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;payload jsonb;refs jsonb;media jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='certification';
 if not found then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if payload is null then return null;end if;
 select coalesce(jsonb_agg(jsonb_build_object('type',t.kind,'recordId',ref->>'recordId','available',r.id is not null,'published',r.published_revision_id is not null,'locale',r.locale) order by t.kind,ref->>'recordId'),'[]') into refs
 from (values('locations','location'),('pages','page')) t(key,kind)
 cross join lateral jsonb_array_elements(case when jsonb_typeof(payload#>array['relationships',t.key])='array' then payload#>array['relationships',t.key] else '[]'::jsonb end) ref
 left join cms.records r on r.website_id=p_site and r.id=(ref->>'recordId')::uuid and r.content_type=t.kind and r.id<>p_record;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',id,'available',exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=x.id and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and length(btrim(m.rights_evidence))>0 and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()))) order by id),'[]') into media
 from (select distinct value#>>'{}' id from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string') x;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'references',refs,'media',media,'claimApproved',cms.certification_claim_approval_current(p_site,p_record,p_revision,p_record));
exception when invalid_text_representation then return null;
end $$;
revoke all on function cms.get_certification_revision_evidence(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_certification_revision_evidence(uuid,uuid,uuid) to service_role;
create function cms.get_public_certification(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r cms.records;v cms.revisions;e jsonb;body jsonb;
begin
 if p_locale is distinct from 'en' or p_path !~ '^/certifications/[a-z0-9]+(-[a-z0-9]+)*$' then return null;end if;
 select * into r from cms.records where website_id=p_site and path=p_path and locale=p_locale and content_type='certification' and published_revision_id is not null;
 if not found then return null;end if;
 select * into v from cms.revisions where website_id=p_site and record_id=r.id and id=r.published_revision_id;
 if not found or not exists(select 1 from cms.validations checked join cms.validation_policy policy on policy.content_type='certification' and policy.validator_version=checked.validator_version where checked.revision_id=v.id and checked.valid and checked.validator_version='certification-1') then return null;end if;
 body:=v.payload;
 if body->>'schemaVersion' is distinct from '1' or p_path is distinct from '/certifications/'||(body->>'slug') then return null;end if;
 e:=cms.get_certification_revision_evidence(p_site,r.id,v.id);
 if e is null or e->>'claimApproved' is distinct from 'true' then return null;end if;
 if exists(select 1 from jsonb_array_elements(e->'media') x where x->>'available' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'references') x where x->>'available' is distinct from 'true' or x->>'published' is distinct from 'true' or x->>'locale' is distinct from p_locale) then return null;end if;
 -- Never expose private evidence identities, owner details or internal review notes.
 return jsonb_build_object('recordId',r.id,'revisionId',v.id,'type','certification','path',r.path,'locale',r.locale,'payload',
 (select jsonb_object_agg(key,value) from jsonb_each(body) where key=any(array['schemaVersion','title','slug','summary','issuer','certificateNumber','statement','scope','issuedOn','validFrom','expiresOn','validity','status','seo'])));
exception when invalid_text_representation then return null;
end $$;
create function cms.list_published_certifications(p_site uuid,p_after uuid default null,p_limit integer default 100)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(item order by id),'[]') from (
 select r.id,jsonb_build_object('recordId',r.id,'revisionId',r.published_revision_id,'path',r.path,'modifiedAt',v.created_at,'title',p.value#>>'{payload,title}','summary',p.value#>>'{payload,summary}','issuer',p.value#>>'{payload,issuer}','seo',p.value#>'{payload,seo}') item
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
 cross join lateral(select cms.get_public_certification(p_site,r.path,'en') value) p
 where r.website_id=p_site and r.content_type='certification' and r.locale='en' and (p_after is null or r.id>p_after) and p.value is not null
 order by r.id limit greatest(1,least(coalesce(p_limit,100),100))) x;
$$;
revoke all on function cms.get_public_certification(uuid,text,text),cms.list_published_certifications(uuid,uuid,integer) from public;
grant execute on function cms.get_public_certification(uuid,text,text),cms.list_published_certifications(uuid,uuid,integer) to anon,authenticated,service_role;
commit;
