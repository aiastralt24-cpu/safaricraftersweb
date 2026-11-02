begin;
-- Defense in depth: public reads never return arbitrary top-level revision metadata.
create function cms.public_page_payload(p_type text,p_payload jsonb)
returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from jsonb_each(p_payload)
 where (p_type='journey' and key=any(array['slug','title','description','intro','region','duration','bestMonths','groupSize','difficulty','price','buttonLabel','seoTitle','seoDescription','itinerary','faqs','media']))
 or (p_type in ('page','homepage') and key=any(array['composition','seo']));
$$;
create or replace function cms.get_public_page(p_site uuid,p_path text,p_locale text default 'en')
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('recordId',r.id,'revisionId',v.id,'type',r.content_type,'payload',cms.public_page_payload(r.content_type,v.payload))
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
 where r.website_id=p_site and r.path=p_path and r.locale=p_locale and r.content_type in ('journey','page','homepage')
 and cms.record_media_available(p_site,r.content_type,v.payload);
$$;
revoke all on function cms.public_page_payload(text,jsonb) from public;
commit;
