begin;
-- Add only the scoped website identity needed by the authenticated media viewer.
create or replace function cms.get_preview(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('previewId',s.id,'websiteId',s.website_id,'expiresAt',s.expires_at,'recordId',r.id,'revisionId',v.id,'type',r.content_type,'path',r.path,'locale',r.locale,'payload',v.payload)
 from cms.preview_sessions s join cms.records r on r.website_id=s.website_id and r.id=s.record_id
 join cms.revisions v on v.website_id=s.website_id and v.record_id=s.record_id and v.id=s.revision_id
 where s.id=p_id and s.recipient_id=auth.uid() and s.revoked_at is null and s.expires_at>now()
 and cms.can(s.website_id,'view',r.content_type,r.id)
 and exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
  where m.website_id=s.website_id and m.user_id=s.created_by and m.revoked_at is null and (m.expires_at is null or m.expires_at>now())
  and p.action='view' and p.content_type in ('*',r.content_type) and (p.record_id is null or p.record_id=r.id));
$$;
commit;
