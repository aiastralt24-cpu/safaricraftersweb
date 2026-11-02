begin;
create function cms.get_leadership_revision_evidence(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records;payload jsonb;refs jsonb;media jsonb;links jsonb;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record and content_type='leadership';
 if not found then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if not found then return null;end if;
 select coalesce(jsonb_agg(jsonb_build_object('type',t.kind,'recordId',ref->>'recordId','available',r.id is not null,'published',r.published_revision_id is not null,'locale',r.locale) order by t.kind,ref->>'recordId'),'[]') into refs
 from (values('pages','page'),('projects','project'),('articles','journalArticle'),('documents','document')) t(key,kind)
 cross join lateral jsonb_array_elements(case when jsonb_typeof(payload#>array['relationships',t.key])='array' then payload#>array['relationships',t.key] else '[]'::jsonb end) ref
 left join cms.records r on r.website_id=p_site and r.id=(ref->>'recordId')::uuid and r.content_type=t.kind and r.id<>p_record;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',id,'available',exists(select 1 from cms.media_objects m where m.website_id=p_site and m.id=x.id and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and length(btrim(m.rights_evidence))>0 and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()))) order by id),'[]') into media
 from (select distinct value#>>'{}' id from jsonb_path_query(payload,'$.**.assetId') value where jsonb_typeof(value)='string') x;
 select coalesce(jsonb_agg(jsonb_build_object('href',href,'available',cms.tanzania_link_path(href) is not null and position('#' in href)=0 and (cms.tanzania_link_path(href)=rec.path or exists(select 1 from cms.navigation_public_paths where path=cms.tanzania_link_path(href)) or cms.concept_link_available(p_site,cms.tanzania_link_path(href),rec.locale))) order by href),'[]') into links
 from (select distinct value#>>'{}' href from jsonb_path_query(payload,'$.**.href') value where jsonb_typeof(value)='string' and (value#>>'{}' like '/%' or value#>>'{}' like '#%')) x;
 return jsonb_build_object('websiteId',p_site,'recordId',p_record,'revisionId',p_revision,'references',refs,'media',media,'links',links);
exception when invalid_text_representation then return null;
end $$;
revoke all on function cms.get_leadership_revision_evidence(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function cms.get_leadership_revision_evidence(uuid,uuid,uuid) to service_role;
create function cms.get_public_leadership(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r cms.records;v cms.revisions;e jsonb;body jsonb;ref jsonb;doc jsonb;
begin
 if p_locale is distinct from 'en' or p_path !~ '^/leadership/[a-z0-9]+(-[a-z0-9]+)*$' then return null;end if;
 select * into r from cms.records where website_id=p_site and path=p_path and locale=p_locale and content_type='leadership' and published_revision_id is not null;
 if not found then return null;end if;
 select * into v from cms.revisions where website_id=p_site and record_id=r.id and id=r.published_revision_id;
 if not found or not exists(select 1 from cms.validations checked join cms.validation_policy policy on policy.content_type='leadership' and policy.validator_version=checked.validator_version where checked.revision_id=v.id and checked.valid and checked.validator_version='leadership-1') then return null;end if;
 body:=v.payload;
 if body->>'schemaVersion' is distinct from '1' or p_path is distinct from '/leadership/'||(body->>'slug') then return null;end if;
 e:=cms.get_leadership_revision_evidence(p_site,r.id,v.id);if e is null then return null;end if;
 if exists(select 1 from jsonb_array_elements(e->'media') x where x->>'available' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'links') x where x->>'available' is distinct from 'true')
 or exists(select 1 from jsonb_array_elements(e->'references') x where x->>'available' is distinct from 'true' or x->>'published' is distinct from 'true' or x->>'locale' is distinct from p_locale) then return null;end if;
 -- Public document relationships may not turn authenticated evidence into visitor data.
 for ref in select value from jsonb_array_elements(coalesce(body#>'{relationships,documents}','[]')) loop
  doc:=cms.get_document_download(p_site,(ref->>'recordId')::uuid);if doc is null or doc->>'access' is distinct from 'public' then return null;end if;
 end loop;
 return jsonb_build_object('recordId',r.id,'revisionId',v.id,'type','leadership','path',r.path,'locale',r.locale,'payload',
 (select jsonb_object_agg(key,value) from jsonb_each(body) where key=any(array['schemaVersion','title','slug','summary','role','department','status','sortOrder','links','body','image','seo'])));
exception when invalid_text_representation then return null;
end $$;
create function cms.list_published_leadership(p_site uuid,p_after uuid default null,p_limit integer default 100)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(item order by id),'[]'::jsonb) from (
 select r.id,jsonb_build_object('recordId',r.id,'revisionId',r.published_revision_id,'path',r.path,'modifiedAt',(select created_at from cms.revisions where id=r.published_revision_id),'title',p.value#>>'{payload,title}','summary',p.value#>>'{payload,summary}','image',p.value#>'{payload,image}','role',p.value#>>'{payload,role}','department',p.value#>>'{payload,department}','sortOrder',p.value#>'{payload,sortOrder}','status',p.value#>>'{payload,status}','seo',p.value#>'{payload,seo}') item
 from cms.records r cross join lateral(select cms.get_public_leadership(p_site,r.path,'en') value) p
 where r.website_id=p_site and r.content_type='leadership' and r.locale='en' and (p_after is null or r.id>p_after) and p.value is not null order by r.id limit greatest(1,least(coalesce(p_limit,100),100))) x;
$$;
revoke all on function cms.get_public_leadership(uuid,text,text),cms.list_published_leadership(uuid,uuid,integer) from public;
grant execute on function cms.get_public_leadership(uuid,text,text),cms.list_published_leadership(uuid,uuid,integer) to anon,authenticated,service_role;
alter function cms.get_public_leadership(uuid,text,text) rename to get_public_leadership_before_related;
revoke all on function cms.get_public_leadership_before_related(uuid,text,text) from public,anon,authenticated,service_role;
create function cms.leadership_related_public_cards(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare source cms.records;payload jsonb;kind text;ref jsonb;target cms.records;delivered jsonb;title text;href text;cards jsonb:='[]';
begin
 select * into source from cms.records where website_id=p_site and id=p_record and content_type='leadership' and locale='en';
 if not found then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if not found then return null;end if;
 foreach kind in array array['page','project','journalArticle','document'] loop
  for ref in select value from jsonb_array_elements(coalesce(payload#>array['relationships',case kind when 'page' then 'pages' when 'project' then 'projects' when 'journalArticle' then 'articles' when 'destination' then 'destinations' else 'documents' end],'[]'::jsonb)) loop
   select * into target from cms.records where website_id=p_site and id=(ref->>'recordId')::uuid and content_type=kind and locale=source.locale and published_revision_id is not null;
   if not found or target.id=p_record then return null;end if;
   href:=target.path;
   if kind='page' then
    delivered:=cms.get_public_page(p_site,target.path,target.locale);
    title:=coalesce(delivered#>>'{payload,composition,title}',delivered#>>'{payload,title}');
   elsif kind='project' then
    delivered:=cms.get_public_project(p_site,target.path,target.locale);title:=delivered#>>'{payload,title}';
   elsif kind='journalArticle' then
    delivered:=cms.get_public_journal_article(p_site,target.path,target.locale);title:=delivered#>>'{payload,title}';
   elsif kind='destination' then
    delivered:=cms.get_public_destination(p_site,target.path,target.locale);title:=delivered#>>'{page,payload,title}';
   else
    delivered:=cms.get_document_download(p_site,target.id);
    if delivered->>'access' is distinct from 'public' then return null;end if;
    select v.payload->>'title' into title from cms.revisions v where v.website_id=p_site and v.record_id=target.id and v.id=target.published_revision_id;
    href:='/api/documents/download?record='||target.id::text||'&revision='||target.published_revision_id::text;
   end if;
   if delivered is null or title is null or length(btrim(title))=0 or href is null then return null;end if;
   cards:=cards||jsonb_build_array(jsonb_build_object('type',kind,'title',title,'href',href));
   if jsonb_array_length(cards)>150 then return null;end if;
  end loop;
 end loop;
 return cards;
exception when invalid_text_representation or invalid_parameter_value then return null;
end $$;
create function cms.get_public_leadership(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare page jsonb;cards jsonb;
begin
 page:=cms.get_public_leadership_before_related(p_site,p_path,p_locale);if page is null then return null;end if;
 cards:=cms.leadership_related_public_cards(p_site,(page->>'recordId')::uuid,(page->>'revisionId')::uuid);
 if cards is null then return null;end if;
 return page||jsonb_build_object('related',cards);
end $$;
revoke all on function cms.leadership_related_public_cards(uuid,uuid,uuid),cms.get_public_leadership(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function cms.get_public_leadership(uuid,text,text) to anon,authenticated,service_role;
commit;
