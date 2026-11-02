begin;
-- Return only the fields rendered by the homepage guest-note carousel.
create function cms.get_public_homepage_guest(p_site uuid,p_record uuid,p_locale text default 'en')
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('recordId',r.id,'revisionId',v.id,
 'name',case when v.payload->'anonymous'='true'::jsonb then 'Anonymous guest' else v.payload->>'name' end,
 'quote',v.payload->>'quote','trip',v.payload->>'trip','category',v.payload->>'guestType')
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
 where r.website_id=p_site and r.id=p_record and r.content_type='testimonial' and r.locale=p_locale and p_locale='en'
 and v.payload->'verified'='true'::jsonb and v.payload->'consent'->>'status'='granted'
 and length(trim(v.payload->'consent'->>'evidence'))>0 and jsonb_typeof(v.payload->'anonymous')='boolean'
 and length(trim(v.payload->>'name'))>0 and length(trim(v.payload->>'quote'))>0;
$$;
revoke all on function cms.get_public_homepage_guest(uuid,uuid,text) from public;
grant execute on function cms.get_public_homepage_guest(uuid,uuid,text) to anon,authenticated;
commit;
