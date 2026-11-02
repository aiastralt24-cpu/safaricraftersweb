begin;
-- Internal projection helper. Selected scalar fields may never carry nested
-- objects; unknown properties are omitted rather than exposed anonymously.
create function cms.journal_public_scalars(p_value jsonb,p_fields text[])
returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb;
begin
 if jsonb_typeof(p_value) is distinct from 'object' then return null; end if;
 if exists(select 1 from jsonb_each(p_value) where key=any(p_fields) and jsonb_typeof(value) not in ('string','number','boolean')) then return null; end if;
 select coalesce(jsonb_object_agg(key,value),'{}') into result from jsonb_each(p_value) where key=any(p_fields);
 return result;
end $$;

create function cms.journal_public_payload(p_payload jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb; item jsonb; projected jsonb; images jsonb:='[]'; blocks jsonb:='[]'; seo jsonb; cta jsonb; button jsonb; field text;
 image_fields text[]:=array['assetId','alt','decorative','caption','credit'];
begin
 result:=cms.journal_public_scalars(p_payload,array['schemaVersion','slug','title','category','author','date','readTime','description','quote']);
 if result is null then return null; end if;
 foreach field in array array['image','heroImage'] loop
  if p_payload ? field then
   projected:=cms.journal_public_scalars(p_payload->field,image_fields);if projected is null then return null; end if;
   result:=result||jsonb_build_object(field,projected);
  end if;
 end loop;
 if jsonb_typeof(p_payload->'gallery') is distinct from 'array' or jsonb_typeof(p_payload->'body') is distinct from 'array' then return null; end if;
 if jsonb_array_length(p_payload->'gallery')>50 or jsonb_array_length(p_payload->'body')>200 then return null; end if;
 for item in select value from jsonb_array_elements(p_payload->'gallery') loop
  projected:=cms.journal_public_scalars(item,image_fields);if projected is null then return null; end if;images:=images||jsonb_build_array(projected);
 end loop;
 for item in select value from jsonb_array_elements(p_payload->'body') loop
  case item->>'kind'
   when 'paragraph' then projected:=cms.journal_public_scalars(item,array['id','kind','text']);
   when 'heading' then projected:=cms.journal_public_scalars(item,array['id','kind','text','level']);
   when 'quote' then projected:=cms.journal_public_scalars(item,array['id','kind','text','attribution']);
   when 'link' then projected:=cms.journal_public_scalars(item,array['id','kind','label','href']);
   when 'list' then
    projected:=cms.journal_public_scalars(item,array['id','kind','ordered']);
    if projected is null or jsonb_typeof(item->'items') is distinct from 'array' then return null; end if;
    if jsonb_array_length(item->'items')>50 or exists(select 1 from jsonb_array_elements(item->'items') where jsonb_typeof(value)<>'string') then return null; end if;
    projected:=projected||jsonb_build_object('items',item->'items');
   when 'image' then
    projected:=cms.journal_public_scalars(item,array['id','kind']);
    button:=cms.journal_public_scalars(item->'image',image_fields);if projected is null or button is null then return null; end if;
    projected:=projected||jsonb_build_object('image',button);
   else return null;
  end case;
  if projected is null then return null; end if;blocks:=blocks||jsonb_build_array(projected);
 end loop;
 seo:=cms.journal_public_scalars(p_payload->'seo',array['schemaVersion','title','description','canonical','indexing','following','socialTitle','socialDescription','breadcrumbLabel','sitemap']);
 if seo is null then return null; end if;
 if p_payload->'seo' ? 'socialImage' then
  projected:=cms.journal_public_scalars(p_payload->'seo'->'socialImage',image_fields);if projected is null then return null; end if;
  seo:=seo||jsonb_build_object('socialImage',projected);
 end if;
 cta:=cms.journal_public_scalars(p_payload->'cta',array['enabled','heading','copy']);
 button:=cms.journal_public_scalars(p_payload->'cta'->'button',array['label','href','newWindow']);
 if cta is null or button is null then return null; end if;
 return result||jsonb_build_object('body',blocks,'gallery',images,'seo',seo,'cta',cta||jsonb_build_object('button',button));
end $$;

create function cms.get_public_journal_article(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rec cms.records; payload jsonb; safe_payload jsonb;
begin
 if p_locale is distinct from 'en' or p_path is null or length(p_path)>109 or p_path !~ '^/journal/[a-z0-9]+(-[a-z0-9]+)*$' then return null; end if;
 select * into rec from cms.records where website_id=p_site and content_type='journalArticle' and path=p_path and locale=p_locale and published_revision_id is not null;
 if not found then return null; end if;
 select v.payload into payload from cms.revisions v where v.website_id=p_site and v.record_id=rec.id and v.id=rec.published_revision_id;
 if payload->>'slug' is distinct from substr(p_path,10) then return null; end if;
 safe_payload:=cms.journal_public_payload(payload);if safe_payload is null then return null; end if;
 if not cms.record_media_available(p_site,'journalArticle',safe_payload) then return null; end if;
 if exists(select 1 from jsonb_path_query(safe_payload,'$.**.assetId') value
  left join cms.media_objects m on m.website_id=p_site and m.id=value #>> '{}'
  where jsonb_typeof(value)<>'string' or m.id is null or m.mime_type<>'image/webp') then return null; end if;
 return jsonb_build_object('recordId',rec.id,'revisionId',rec.published_revision_id,'type','journalArticle','path',rec.path,'locale',rec.locale,'payload',safe_payload);
end $$;
revoke all on function cms.journal_public_scalars(jsonb,text[]),cms.journal_public_payload(jsonb),cms.get_public_journal_article(uuid,text,text) from public;
grant execute on function cms.get_public_journal_article(uuid,text,text) to anon,authenticated;
-- No journal publication policy is enabled by this migration.
commit;
