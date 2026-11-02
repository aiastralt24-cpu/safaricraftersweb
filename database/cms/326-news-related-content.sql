begin;
alter function cms.get_public_news(uuid,text,text) rename to get_public_news_before_related;
revoke all on function cms.get_public_news_before_related(uuid,text,text) from public,anon,authenticated,service_role;
create function cms.news_related_public_cards(p_site uuid,p_record uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare source cms.records;payload jsonb;kind text;ref jsonb;target cms.records;delivered jsonb;title text;href text;cards jsonb:='[]';
begin
 select * into source from cms.records where website_id=p_site and id=p_record and content_type='news' and locale='en';
 if not found then return null;end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=p_record and v.id=p_revision;
 if not found then return null;end if;
 foreach kind in array array['page','project','journalArticle','destination','document'] loop
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
create function cms.get_public_news(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare page jsonb;cards jsonb;
begin
 page:=cms.get_public_news_before_related(p_site,p_path,p_locale);if page is null then return null;end if;
 cards:=cms.news_related_public_cards(p_site,(page->>'recordId')::uuid,(page->>'revisionId')::uuid);
 if cards is null then return null;end if;
 return page||jsonb_build_object('related',cards);
end $$;
revoke all on function cms.news_related_public_cards(uuid,uuid,uuid),cms.get_public_news(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function cms.get_public_news(uuid,text,text) to anon,authenticated,service_role;
commit;
