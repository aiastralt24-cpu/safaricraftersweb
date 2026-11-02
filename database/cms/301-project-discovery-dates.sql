begin;
-- Public discovery dates describe released content, never subsequent private draft activity.
create or replace function cms.list_published_projects(p_site uuid,p_after uuid default null,p_limit integer default 100)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(item order by id),'[]'::jsonb) from (
 select r.id,jsonb_build_object('recordId',r.id,'revisionId',r.published_revision_id,'path',r.path,'modifiedAt',published.created_at,'title',p.value#>>'{payload,title}','summary',p.value#>>'{payload,summary}','image',p.value#>'{payload,image}','industry',p.value#>>'{payload,industry}','kind',p.value#>>'{payload,kind}','seo',p.value#>'{payload,seo}') item
 from cms.records r join cms.revisions published on published.website_id=r.website_id and published.record_id=r.id and published.id=r.published_revision_id cross join lateral(select cms.get_public_project(p_site,r.path,'en') value) p
 where r.website_id=p_site and r.content_type='project' and r.locale='en' and (p_after is null or r.id>p_after) and p.value is not null order by r.id limit greatest(1,least(coalesce(p_limit,100),100))) x;
$$;
commit;
