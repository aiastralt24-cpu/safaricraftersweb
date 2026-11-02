begin;
alter function cms.get_public_project(uuid,text,text) rename to get_public_project_before_related;
revoke all on function cms.get_public_project_before_related(uuid,text,text) from public,anon,authenticated,service_role;
create function cms.project_related_public_cards(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare vertices uuid[];node uuid;r cms.records;payload jsonb;ref jsonb;target cms.records;delivered jsonb;cards jsonb:='[]';href text;title text;kind text;
begin
 if not exists(select 1 from cms.records source_record join cms.revisions v on v.website_id=source_record.website_id and v.record_id=source_record.id where source_record.website_id=p_site and source_record.id=p_record and source_record.content_type='project' and v.id=p_revision) then return null;end if;
 -- UNION deduplicates cycles. Bound traversal before collecting the array.
 with recursive graph(id) as (
  select p_record union
  select (edges.edge->>'recordId')::uuid from graph g join cms.records source_record on source_record.website_id=p_site and source_record.id=g.id and source_record.content_type='project'
  join cms.revisions v on v.website_id=source_record.website_id and v.record_id=source_record.id and v.id=case when source_record.id=p_record then p_revision else source_record.published_revision_id end
  cross join lateral jsonb_array_elements(coalesce(v.payload#>'{relationships,projects}','[]'::jsonb)) edges(edge)
 ) select array_agg(id) into vertices from(select id from graph limit 201) bounded;
 if cardinality(vertices)>200 then return null;end if;
 foreach node in array vertices loop
  select * into r from cms.records where website_id=p_site and id=node and content_type='project';if not found then return null;end if;
  if node<>p_record and cms.get_public_project_before_related(p_site,r.path,r.locale) is null then return null;end if;
  select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=node and v.id=case when node=p_record then p_revision else r.published_revision_id end;
  if payload is null or jsonb_array_length(coalesce(payload#>'{relationships,products}','[]'))>0 then return null;end if;
  foreach kind in array array['project','destination','document'] loop
   for ref in select value from jsonb_array_elements(coalesce(payload#>array['relationships',case kind when 'project' then 'projects' when 'destination' then 'destinations' else 'documents' end],'[]'::jsonb)) loop
    select * into target from cms.records where website_id=p_site and id=(ref->>'recordId')::uuid and content_type=kind and locale=r.locale and published_revision_id is not null;
    if not found or target.id=node then return null;end if;
    if kind='project' then
     delivered:=cms.get_public_project_before_related(p_site,target.path,target.locale);title:=delivered#>>'{payload,title}';href:=target.path;
    elsif kind='destination' then
     delivered:=cms.get_public_destination(p_site,target.path,target.locale);title:=delivered#>>'{page,payload,title}';href:=target.path;
    else
     delivered:=cms.get_document_download(p_site,target.id);if delivered->>'access' is distinct from 'public' then return null;end if;
     select v.payload->>'title' into title from cms.revisions v where v.website_id=p_site and v.record_id=target.id and v.id=target.published_revision_id;
     href:='/api/documents/download?record='||target.id::text||'&revision='||target.published_revision_id::text;
    end if;
    if delivered is null or title is null or length(btrim(title))=0 or href is null then return null;end if;
    if node=p_record then cards:=cards||jsonb_build_array(jsonb_build_object('type',kind,'title',title,'href',href));end if;
   end loop;
  end loop;
 end loop;
 return cards;
exception when invalid_text_representation or invalid_parameter_value then return null;
end $$;
create function cms.get_public_project(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare page jsonb;cards jsonb;
begin
 page:=cms.get_public_project_before_related(p_site,p_path,p_locale);if page is null then return null;end if;
 cards:=cms.project_related_public_cards(p_site,(page->>'recordId')::uuid,(page->>'revisionId')::uuid);if cards is null then return null;end if;
 return page||jsonb_build_object('related',cards);
end $$;
revoke all on function cms.project_related_public_cards(uuid,uuid,uuid),cms.get_public_project(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function cms.get_public_project(uuid,text,text) to anon,authenticated,service_role;
commit;
