begin;
alter table cms.leads add column follow_up_generation integer not null default 1 check(follow_up_generation>0);
create function cms.advance_lead_follow_up_generation()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.next_follow_up is distinct from old.next_follow_up or new.assigned_to is distinct from old.assigned_to
 or (old.status in('won','lost','invalid') and new.status not in('won','lost','invalid')) then
  new.follow_up_generation:=old.follow_up_generation+1;
 else new.follow_up_generation:=old.follow_up_generation;end if;
 return new;
end $$;
create trigger cms_lead_follow_up_generation before update on cms.leads for each row execute function cms.advance_lead_follow_up_generation();
create table cms.lead_reminder_states (
 website_id uuid not null,lead_id uuid not null,user_id uuid not null references auth.users(id),generation integer not null check(generation>0),
 state text not null check(state in('pending','snoozed','acknowledged')),snoozed_until timestamptz,version integer not null check(version>0),updated_at timestamptz not null default now(),
 primary key(website_id,lead_id,user_id,generation),foreign key(website_id,lead_id) references cms.leads(website_id,id),
 check((state='snoozed')=(snoozed_until is not null))
);
alter table cms.lead_reminder_states enable row level security;
-- Personal reminder choices do not grant enquiry edit rights or change lead dates.
create function cms.list_lead_reminders(p_site uuid,p_scope text default 'mine',p_filter text default 'due',p_after uuid default null,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb; more boolean;
begin
 if auth.uid() is null then raise exception 'forbidden' using errcode='42501';end if;
 if p_scope is null or p_scope not in('mine','accessible') or p_filter is null or p_filter not in('due','snoozed','acknowledged') or p_limit is null or p_limit not between 1 and 20 then raise exception 'invalid_reminder_filter';end if;
 with eligible as (
  select l.id,l.status,l.priority,l.version,l.next_follow_up,l.follow_up_generation,
   coalesce(s.version,0) reminder_version,s.snoozed_until,
   case when s.state='acknowledged' then 'acknowledged' when s.state='snoozed' and s.snoozed_until>now() then 'snoozed' else 'due' end reminder_state
  from cms.leads l left join cms.lead_reminder_states s on s.website_id=l.website_id and s.lead_id=l.id and s.user_id=auth.uid() and s.generation=l.follow_up_generation
  where l.website_id=p_site and (p_scope='accessible' or l.assigned_to=auth.uid()) and (p_after is null or l.id>p_after)
   and cms.can_lead(p_site,'view',l.id) and l.next_follow_up<=now() and l.status not in('won','lost','invalid')
   and not exists(select 1 from cms.lead_merges m where m.website_id=p_site and m.source_id=l.id)
 ), matches as materialized(select * from eligible where reminder_state=p_filter order by id limit p_limit+1)
 select coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'status',v.status,'priority',v.priority,'version',v.version,'followUp',v.next_follow_up,
 'generation',v.follow_up_generation,'reminderVersion',v.reminder_version,'state',v.reminder_state,'snoozedUntil',v.snoozed_until) order by v.id)
 from (select * from matches order by id limit p_limit) v),'[]'::jsonb),(select count(*)>p_limit from matches) into items,more;
 return jsonb_build_object('websiteId',p_site,'actorId',auth.uid(),'scope',p_scope,'filter',p_filter,'asOf',now(),'items',items,'nextCursor',case when more then items->-1->>'id' else null end);
end $$;
create function cms.set_lead_reminder(p_site uuid,p_lead uuid,p_generation integer,p_expected integer,p_action text,p_until timestamptz default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare lead cms.leads; previous cms.lead_reminder_states; desired text; next_version integer;
begin
 if not cms.can_lead(p_site,'view',p_lead) then raise exception 'forbidden' using errcode='42501';end if;
 if p_generation is null or p_generation<1 or p_expected is null or p_expected<0 or p_action is null or p_action not in('acknowledge','snooze','reset') then raise exception 'invalid_reminder_action';end if;
 -- Locks also serialize personal choices with rescheduling, reassignment and merging.
 select * into lead from cms.leads where website_id=p_site and id=p_lead for update;
 if not found then raise exception 'forbidden' using errcode='42501';end if;
 if lead.follow_up_generation is distinct from p_generation or lead.next_follow_up is null or lead.next_follow_up>now() or lead.status in('won','lost','invalid')
 or exists(select 1 from cms.lead_merges where website_id=p_site and source_id=p_lead) then raise exception 'reminder_changed' using errcode='40001';end if;
 desired:=case p_action when 'acknowledge' then 'acknowledged' when 'snooze' then 'snoozed' else 'pending' end;
 if (p_action<>'snooze' and p_until is not null) or (p_action='snooze' and (p_until is null or p_until<=now() or p_until>now()+interval '30 days')) then raise exception 'invalid_reminder_snooze';end if;
 select * into previous from cms.lead_reminder_states where website_id=p_site and lead_id=p_lead and user_id=auth.uid() and generation=p_generation;
 if coalesce(previous.version,0)<>p_expected then
  -- An exact immediate retry is harmless; any intervening choice remains a conflict.
  if previous.version=p_expected+1 and previous.state=desired and previous.snoozed_until is not distinct from p_until then
   return jsonb_build_object('websiteId',p_site,'actorId',auth.uid(),'leadId',p_lead,'generation',p_generation,'version',previous.version,'state',desired,'snoozedUntil',p_until,'replayed',true);
  end if;
  raise exception 'reminder_changed' using errcode='40001';
 end if;
 next_version:=p_expected+1;
 insert into cms.lead_reminder_states(website_id,lead_id,user_id,generation,state,snoozed_until,version)
 values(p_site,p_lead,auth.uid(),p_generation,desired,p_until,next_version)
 on conflict(website_id,lead_id,user_id,generation) do update set state=excluded.state,snoozed_until=excluded.snoozed_until,version=excluded.version,updated_at=now();
 return jsonb_build_object('websiteId',p_site,'actorId',auth.uid(),'leadId',p_lead,'generation',p_generation,'version',next_version,'state',desired,'snoozedUntil',p_until,'replayed',false);
end $$;
revoke all on function cms.advance_lead_follow_up_generation(),cms.list_lead_reminders(uuid,text,text,uuid,integer),cms.set_lead_reminder(uuid,uuid,integer,integer,text,timestamptz) from public;
grant execute on function cms.list_lead_reminders(uuid,text,text,uuid,integer),cms.set_lead_reminder(uuid,uuid,integer,integer,text,timestamptz) to authenticated;
commit;
