begin;
create function cms.get_translation_family(p_site uuid,p_record uuid,p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare selected cms.records;source cms.records;root_id uuid;items jsonb;next_id uuid;
begin
 select * into selected from cms.records where website_id=p_site and id=p_record;
 if not found or not cms.can(p_site,'view',selected.content_type,p_record) then raise exception 'forbidden' using errcode='42501';end if;
 select source_record_id into root_id from cms.translations where website_id=p_site and record_id=p_record;
 root_id:=coalesce(root_id,p_record);
 select * into source from cms.records where website_id=p_site and id=root_id;
 if not found or not cms.can(p_site,'view',source.content_type,source.id) then raise exception 'forbidden' using errcode='42501';end if;
 with eligible as (
  select r.*,t.source_revision_id,t.reviewed_revision_id from cms.translations t
  join cms.records r on r.website_id=t.website_id and r.id=t.record_id
  where t.website_id=p_site and t.source_record_id=root_id and (p_after is null or r.id>p_after)
   and cms.can(p_site,'view',r.content_type,r.id)
  order by r.id limit 51
 ),page as (select * from eligible order by id limit 50)
 select coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'title',p.internal_title,'locale',p.locale,'path',p.path,'type',p.content_type,'revision',p.current_revision_id,
  'status',case when p.source_revision_id is distinct from source.current_revision_id then 'source_changed' when p.reviewed_revision_id is null then 'unreviewed' when p.current_revision_id is distinct from p.reviewed_revision_id then 'translation_changed' else 'current' end) order by p.id) from page p),'[]'),
  case when (select count(*) from eligible)>50 then (select id from page order by id desc limit 1) else null end into items,next_id;
 return jsonb_build_object('recordId',p_record,'source',jsonb_build_object('id',source.id,'title',source.internal_title,'locale',source.locale,'path',source.path,'type',source.content_type,'revision',source.current_revision_id),'translations',items,'nextCursor',next_id);
end $$;
revoke all on function cms.get_translation_family(uuid,uuid,uuid) from public;
grant execute on function cms.get_translation_family(uuid,uuid,uuid) to authenticated;
commit;
