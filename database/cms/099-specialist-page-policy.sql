begin;
update cms.validation_policy set validator_version='composition-2' where content_type='page';
create function cms.enforce_specialist_page_route()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.published_revision_id is null then return new; end if;
 if tg_op='UPDATE' and old.content_type='page' and old.path='/specialists' and (new.content_type<>'page' or new.path is distinct from '/specialists') then raise exception 'specialist_page_route_not_ready'; end if;
 if new.content_type='page' and new.path='/specialists' and new.locale<>'en' then raise exception 'specialist_page_route_not_ready'; end if;
 return new;
end $$;
create trigger cms_specialist_page_route before insert or update of published_revision_id,path,locale,content_type on cms.records for each row execute function cms.enforce_specialist_page_route();
revoke all on function cms.enforce_specialist_page_route() from public;
commit;
