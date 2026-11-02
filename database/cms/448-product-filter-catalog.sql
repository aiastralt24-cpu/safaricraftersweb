-- Include only public definition/specification evidence from the same deliverable revision.
create or replace function cms.list_published_products(p_site uuid,p_after uuid default null,p_limit integer default 100,p_category uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(item order by id),'[]') from (
 select r.id,jsonb_build_object('recordId',r.id,'revisionId',r.published_revision_id,'path',r.path,'modifiedAt',v.created_at,'title',p.value#>>'{payload,title}','summary',p.value#>>'{payload,summary}','code',p.value#>>'{payload,code}','brand',p.value#>>'{payload,brand}','image',coalesce(p.value#>'{payload,gallery,0}','null'),'lifecycle',p.value#>>'{payload,lifecycle}','seo',p.value#>'{payload,seo}','filterEvidence',jsonb_build_object('category',p.value#>'{payload,category}','subcategory',p.value#>'{payload,subcategory}','specifications',p.value#>'{payload,specifications}','categories',p.value->'categories')) item
 from cms.records r join cms.revisions v on v.website_id=r.website_id and v.record_id=r.id and v.id=r.published_revision_id
 cross join lateral(select cms.get_public_product(p_site,r.path,'en') value) p
 where r.website_id=p_site and r.content_type='product' and r.locale='en' and (p_after is null or r.id>p_after) and p.value is not null
 and (p_category is null or v.payload#>>'{category,recordId}'=p_category::text or v.payload#>>'{subcategory,recordId}'=p_category::text)
 order by r.id limit greatest(1,least(coalesce(p_limit,100),100))) x;
$$;
revoke all on function cms.list_published_products(uuid,uuid,integer,uuid) from public;
grant execute on function cms.list_published_products(uuid,uuid,integer,uuid) to anon,authenticated,service_role;
