begin;
-- The expedition editor requires its list title and payload title to agree after restore.
create or replace function cms.restore_draft(p_site uuid,p_record uuid,p_revision uuid,p_expected uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec cms.records; old_payload jsonb; restored_title text;
begin
 select * into rec from cms.records where website_id=p_site and id=p_record;
 if not found or not cms.can(p_site,'edit',rec.content_type,rec.id) then raise exception 'forbidden' using errcode='42501'; end if;
 select payload into old_payload from cms.revisions where website_id=p_site and record_id=p_record and id=p_revision;
 if not found then raise exception 'revision_not_found'; end if;
 restored_title:=rec.internal_title;
 if rec.content_type='photoExpedition' and jsonb_typeof(old_payload->'title')='string' and length(btrim(old_payload->>'title')) between 1 and 200 then restored_title:=old_payload->>'title'; end if;
 return cms.save_draft(p_site,p_record,p_expected,rec.content_type,rec.path,restored_title,old_payload,rec.locale);
end $$;
commit;
