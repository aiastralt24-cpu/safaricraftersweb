begin;
create function cms.review_journal_migration_media(p_site uuid,p_assets text[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not cms.can(p_site,'create','journalArticle',null) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_assets is null or cardinality(p_assets)>500 or array_position(p_assets,null) is not null
  or (select count(distinct v) from unnest(p_assets) v)<>cardinality(p_assets)
  or exists(select 1 from unnest(p_assets) v where v !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$') then raise exception 'invalid_migration_assets'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('assetId',a.id,'available',coalesce(m.id is not null and cms.can(p_site,'view','document',null) and m.mime_type='image/webp' and m.inspection_status='ready' and m.rights_status='approved' and m.archived_at is null and (m.rights_expires_at is null or m.rights_expires_at>now()),false)) order by a.n),'[]') into result
 from unnest(p_assets) with ordinality a(id,n) left join cms.media_objects m on m.website_id=p_site and m.id=a.id;
 return result;
end $$;
revoke all on function cms.review_journal_migration_media(uuid,text[]) from public;
grant execute on function cms.review_journal_migration_media(uuid,text[]) to authenticated;
commit;
