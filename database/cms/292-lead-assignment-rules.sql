begin;
create table cms.lead_routing (
 website_id uuid primary key references cms.websites(id),version integer not null check(version>0),
 rules jsonb not null check(jsonb_typeof(rules)='array' and jsonb_array_length(rules)<=20),
 updated_by uuid not null references auth.users(id),updated_at timestamptz not null default now()
);
alter table cms.lead_routing enable row level security;
create function cms.lead_routing_owner_eligible(p_site uuid,p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
 where m.website_id=p_site and m.user_id=p_user and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())
 and p.content_type='lead' and p.action='view' and p.record_id is null);
$$;
create function cms.get_lead_routing(p_site uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not cms.can_lead(p_site,'configure') then raise exception 'forbidden' using errcode='42501';end if;
 return jsonb_build_object('websiteId',p_site,'version',coalesce((select version from cms.lead_routing where website_id=p_site),0),'rules',coalesce((select rules from cms.lead_routing where website_id=p_site),'[]'::jsonb));
end $$;
create function cms.get_lead_routing_options(p_site uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare forms jsonb; owners jsonb;
begin
 if not cms.can_lead(p_site,'configure') then raise exception 'forbidden' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'title',coalesce(v.payload->>'title','Enquiry form'),'fields',
 (select coalesce(jsonb_agg(jsonb_build_object('id',f->'id','label',f->'label','type',f->'type','options',coalesce(f->'options','[]'::jsonb))),'[]'::jsonb)
 from jsonb_array_elements(case when jsonb_typeof(v.payload->'fields')='array' then v.payload->'fields' else '[]'::jsonb end) f
 where f->>'type' in('productInterest','enquiryType','city','state','pincode','select','text','multiselect'))) order by r.id),'[]'::jsonb) into forms
 from (select * from cms.records where website_id=p_site and content_type='form' and published_revision_id is not null and cms.can(p_site,'view','form',id) order by id limit 201) r
 join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email) order by u.id),'[]'::jsonb) into owners from
 (select u.id,u.email from auth.users u where cms.lead_routing_owner_eligible(p_site,u.id) order by u.id limit 201) u;
 if jsonb_array_length(forms)>200 or jsonb_array_length(owners)>200 then raise exception 'routing_catalogue_too_large';end if;
 return jsonb_build_object('websiteId',p_site,'forms',forms,'owners',owners);
end $$;
create function cms.save_lead_routing(p_site uuid,p_expected integer,p_rules jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_version integer; rule jsonb; form uuid; owner uuid; field jsonb; payload jsonb;
begin
 if not cms.can_lead(p_site,'configure') then raise exception 'forbidden' using errcode='42501';end if;
 perform 1 from cms.websites where id=p_site for update;if not found then raise exception 'forbidden' using errcode='42501';end if;
 if not cms.can_lead(p_site,'configure') then raise exception 'forbidden' using errcode='42501';end if;
 select coalesce((select version from cms.lead_routing where website_id=p_site),0) into current_version;
 if p_expected is distinct from current_version then raise exception 'lead_routing_conflict' using errcode='40001';end if;
 if p_rules is null or jsonb_typeof(p_rules)<>'array' or jsonb_array_length(p_rules)>20 or octet_length(p_rules::text)>30000 then raise exception 'invalid_lead_routing';end if;
 if exists(select 1 from jsonb_array_elements(p_rules) r group by r->>'id' having count(*)>1) then raise exception 'invalid_lead_routing';end if;
 for rule in select value from jsonb_array_elements(p_rules) loop
  if jsonb_typeof(rule)<>'object' or not rule ?& array['id','name','enabled','formId','fieldId','fieldType','value','ownerId']
   or rule-array['id','name','enabled','formId','fieldId','fieldType','value','ownerId']<>'{}'::jsonb
   or jsonb_typeof(rule->'enabled') is distinct from 'boolean'
   or jsonb_typeof(rule->'name') is distinct from 'string' or length(btrim(rule->>'name')) not between 1 and 100
   or jsonb_typeof(rule->'value') is distinct from 'string' or length(btrim(rule->>'value')) not between 1 and 200
   or jsonb_typeof(rule->'fieldId') is distinct from 'string' or rule->>'fieldId' !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$'
   or jsonb_typeof(rule->'fieldType') is distinct from 'string' or rule->>'fieldType' not in('productInterest','enquiryType','city','state','pincode','select','text','multiselect') then raise exception 'invalid_lead_routing';end if;
  begin perform (rule->>'id')::uuid;form:=(rule->>'formId')::uuid;owner:=(rule->>'ownerId')::uuid;exception when invalid_text_representation then raise exception 'invalid_lead_routing';end;
  if rule->>'id' is null or form is null or owner is null then raise exception 'invalid_lead_routing';end if;
  -- Disabled rules remain editable even after forms or owners become unavailable.
  if (rule->>'enabled')::boolean then
   if not cms.can(p_site,'view','form',form) or not cms.lead_routing_owner_eligible(p_site,owner) then raise exception 'routing_selection_unavailable';end if;
   select v.payload into payload from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id where r.website_id=p_site and r.id=form and r.content_type='form';
   select f into field from jsonb_array_elements(case when jsonb_typeof(payload->'fields')='array' then payload->'fields' else '[]'::jsonb end) f where f->>'id'=rule->>'fieldId';
   if field is null or field->>'type' is distinct from rule->>'fieldType' then raise exception 'routing_selection_unavailable';end if;
   if field->>'type' in('select','multiselect','productInterest','enquiryType') and not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(field->'options')='array' then field->'options' else '[]'::jsonb end) o where o->>'id'=rule->>'value') then raise exception 'routing_selection_unavailable';end if;
  end if;
 end loop;
 insert into cms.lead_routing(website_id,version,rules,updated_by) values(p_site,current_version+1,p_rules,auth.uid())
 on conflict(website_id) do update set version=excluded.version,rules=excluded.rules,updated_by=excluded.updated_by,updated_at=now();
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),'lead_routing.saved',jsonb_build_object('version',current_version+1,'rules',p_rules));
 return cms.get_lead_routing(p_site);
end $$;

alter function cms.accept_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb) rename to accept_enquiry_before_routing;
revoke all on function cms.accept_enquiry_before_routing(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
create function cms.accept_enquiry(p_site uuid,p_form uuid,p_revision uuid,p_request uuid,p_answers jsonb,p_consents jsonb,p_attribution jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare receipt jsonb; config cms.lead_routing; rule jsonb; payload jsonb; field jsonb; answer jsonb; matched boolean; owner uuid; lead uuid;
begin
 receipt:=cms.accept_enquiry_before_routing(p_site,p_form,p_revision,p_request,p_answers,p_consents,p_attribution);
 if (receipt->>'replayed')::boolean then return receipt;end if;
 lead:=(receipt->>'leadId')::uuid;
 select * into config from cms.lead_routing where website_id=p_site;if not found then return receipt;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_form and v.id=p_revision;
 for rule in select value from jsonb_array_elements(config.rules) loop
  if not (rule->>'enabled')::boolean or (rule->>'formId')::uuid<>p_form then continue;end if;
  select f into field from jsonb_array_elements(case when jsonb_typeof(payload->'fields')='array' then payload->'fields' else '[]'::jsonb end) f where f->>'id'=rule->>'fieldId';
  if field is null or field->>'type' is distinct from rule->>'fieldType' then continue;end if;
  answer:=p_answers->(rule->>'fieldId');
  if field->>'type'='multiselect' then matched:=jsonb_typeof(answer)='array' and answer @> jsonb_build_array(rule->>'value');
  elsif field->>'type' in('select','productInterest','enquiryType') then matched:=jsonb_typeof(answer)='string' and answer#>>'{}'=rule->>'value';
  else matched:=jsonb_typeof(answer)='string' and lower(btrim(answer#>>'{}'))=lower(btrim(rule->>'value'));end if;
  if not coalesce(matched,false) then continue;end if;
  owner:=(rule->>'ownerId')::uuid;
  if cms.lead_routing_owner_eligible(p_site,owner) then
   update cms.leads set assigned_to=owner,status='assigned',version=version+1,updated_at=now() where website_id=p_site and id=lead;
   insert into cms.lead_events(website_id,lead_id,action,details) values(p_site,lead,'automatically_assigned',jsonb_build_object('ruleId',rule->'id','ruleName',rule->'name','routingVersion',config.version,'assignedTo',owner));
  else
   insert into cms.lead_events(website_id,lead_id,action,details) values(p_site,lead,'automatic_assignment_unavailable',jsonb_build_object('ruleId',rule->'id','routingVersion',config.version));
  end if;
  exit; -- First matching rule wins. Never silently reroute to another team.
 end loop;
 return receipt;
end $$;
revoke all on function cms.lead_routing_owner_eligible(uuid,uuid),cms.get_lead_routing(uuid),cms.get_lead_routing_options(uuid),cms.save_lead_routing(uuid,integer,jsonb),cms.accept_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb) from public;
grant execute on function cms.get_lead_routing(uuid),cms.get_lead_routing_options(uuid),cms.save_lead_routing(uuid,integer,jsonb) to authenticated;
grant execute on function cms.accept_enquiry(uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb) to service_role;
commit;
