begin;
create function cms.list_uploads(p_site uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'filename',u.filename,'expectedBytes',u.expected_bytes,
  'status',case when u.status='reserved' and u.expires_at<=now() then 'expired' else u.status end,
  'createdAt',u.created_at,'expiresAt',u.expires_at,'errorCode',u.error_code,'attempts',u.attempts) order by u.created_at desc,u.id desc),'[]')
 from (select * from cms.uploads where website_id=p_site and created_by=auth.uid() and cms.can(p_site,'create','document') order by created_at desc,id desc limit 50) u;
$$;
revoke all on function cms.list_uploads(uuid) from public;
grant execute on function cms.list_uploads(uuid) to authenticated;
commit;
