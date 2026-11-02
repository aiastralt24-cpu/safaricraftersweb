begin;
alter table cms.roles add column version integer not null default 1 check(version>0);
create function cms.save_access_role(p_site uuid,p_role uuid,p_expected integer,p_name text,p_permissions jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare previous cms.roles; updated cms.roles; entry jsonb; scope text; operation text; target uuid; before_permissions jsonb;
begin
 if not cms.can_manage_access(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 perform 1 from cms.websites where id=p_site for update;
 if not cms.can_manage_access(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_name is null or length(btrim(p_name)) not between 1 and 100 or p_name ~ '[[:cntrl:]]'
  or p_permissions is null or jsonb_typeof(p_permissions)<>'array' then raise exception 'invalid_role'; end if;
 if jsonb_array_length(p_permissions)>200 or octet_length(p_permissions::text)>100000 then raise exception 'invalid_role'; end if;
 if p_role is null then
  if p_expected is not null then raise exception 'role_conflict' using errcode='40001'; end if;
 else
  select * into previous from cms.roles where website_id=p_site and id=p_role for update;
  if not found then raise exception 'role_not_found'; end if;
  if p_expected is distinct from previous.version then raise exception 'role_conflict' using errcode='40001'; end if;
 end if;
 if exists(select 1 from cms.roles where website_id=p_site and lower(name)=lower(btrim(p_name)) and (p_role is null or id<>p_role)) then raise exception 'role_name_in_use'; end if;
 for entry in select value from jsonb_array_elements(p_permissions) loop
  if jsonb_typeof(entry)<>'object' then raise exception 'invalid_role_permission'; end if;
  if not (entry ?& array['action','contentType','recordId']) or (entry-array['action','contentType','recordId'])<>'{}'::jsonb
   or jsonb_typeof(entry->'action')<>'string' or jsonb_typeof(entry->'contentType')<>'string'
   or jsonb_typeof(entry->'recordId') not in ('string','null') then raise exception 'invalid_role_permission'; end if;
  scope:=entry->>'contentType'; operation:=entry->>'action';
  if operation not in ('view','create','edit','submit','approve','publish','export','delete','configure')
   or scope not in ('*','page','homepage','destination','journey','photoExpedition','journalArticle','specialist','testimonial','navigation','settings','sharedSection','document','form','product','project','lead','access') then raise exception 'invalid_role_permission'; end if;
  begin target:=(entry->>'recordId')::uuid; exception when invalid_text_representation then raise exception 'invalid_role_permission'; end;
  if scope='access' and (operation<>'configure' or target is not null) then raise exception 'invalid_role_permission'; end if;
  if target is not null then
   if operation='create' then raise exception 'invalid_role_permission'; end if;
   if scope='lead' then
    if not exists(select 1 from cms.leads where website_id=p_site and id=target) then raise exception 'invalid_role_permission'; end if;
   elsif not exists(select 1 from cms.records where website_id=p_site and id=target and (scope='*' or content_type=scope)) then raise exception 'invalid_role_permission'; end if;
  end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_permissions) e group by e->>'action',e->>'contentType',(e->>'recordId')::uuid having count(*)>1) then raise exception 'duplicate_role_permission'; end if;
 if p_role is null then
  insert into cms.roles(website_id,name) values(p_site,btrim(p_name)) returning * into updated;
  before_permissions:='[]'::jsonb;
 else
  select coalesce(jsonb_agg(jsonb_build_object('action',action,'contentType',content_type,'recordId',record_id) order by id),'[]'::jsonb) into before_permissions from cms.permissions where website_id=p_site and role_id=p_role;
  update cms.roles set name=btrim(p_name),version=version+1 where website_id=p_site and id=p_role returning * into updated;
  delete from cms.permissions where website_id=p_site and role_id=p_role;
 end if;
 insert into cms.permissions(website_id,role_id,action,content_type,record_id)
 select p_site,updated.id,e->>'action',e->>'contentType',(e->>'recordId')::uuid from jsonb_array_elements(p_permissions) e;
 if not exists(select 1 from cms.memberships m join cms.permissions p on p.website_id=m.website_id and p.role_id=m.role_id
  where m.website_id=p_site and m.revoked_at is null and m.expires_at is null and p.action='configure' and p.content_type='access' and p.record_id is null)
 then raise exception 'permanent_access_administrator_required'; end if;
 insert into cms.audit_events(website_id,actor_id,action,details) values(p_site,auth.uid(),case when p_role is null then 'role.created' else 'role.updated' end,
  jsonb_build_object('roleId',updated.id,'before',case when p_role is null then null else jsonb_build_object('name',previous.name,'version',previous.version,'permissions',before_permissions) end,
   'after',jsonb_build_object('name',updated.name,'version',updated.version,'permissions',p_permissions)));
 return jsonb_build_object('id',updated.id,'name',updated.name,'version',updated.version,'permissions',p_permissions);
end $$;
create or replace function cms.list_access_roles(p_site uuid,p_after uuid default null,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not cms.can_manage_access(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'invalid_page_size'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'version',r.version,
  'permissions',coalesce((select jsonb_agg(jsonb_build_object('action',p.action,'contentType',p.content_type,'recordId',p.record_id) order by p.id)
   from cms.permissions p where p.website_id=p_site and p.role_id=r.id),'[]'::jsonb)) order by r.id)
  from (select id,name,version from cms.roles where website_id=p_site and (p_after is null or id>p_after) order by id limit p_limit) r),'[]'::jsonb);
end $$;
revoke all on function cms.save_access_role(uuid,uuid,integer,text,jsonb) from public;
grant execute on function cms.save_access_role(uuid,uuid,integer,text,jsonb) to authenticated;
commit;
