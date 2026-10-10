create table public.nest_checklist_sync_key(id boolean primary key default true check(id),key_hash text not null,last_seen timestamptz);
create table public.nest_checklist_sheet_state(work_date date not null,shift text not null,sheet_id bigint not null,baseline jsonb not null default '{}'::jsonb,sync_error text,updated_at timestamptz not null default now(),primary key(work_date,shift));
alter table public.nest_checklist_sync_key enable row level security;
alter table public.nest_checklist_sheet_state enable row level security;
revoke all on public.nest_checklist_sync_key,public.nest_checklist_sheet_state from public,anon,authenticated;
grant select,insert,update on public.nest_checklist_sync_key,public.nest_checklist_sheet_state to service_role;
create function public.nest_sync_checklist(p_date date,p_shift text,p_sheet_id bigint,p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare run public.nest_checklists%rowtype; state public.nest_checklist_sheet_state%rowtype; incoming jsonb; task jsonb; idx int; sheet_value jsonb; app_value jsonb; old_value jsonb; base jsonb; writes jsonb='[]'; conflicts jsonb='[]'; next_task jsonb; count_imported int=0;
begin
 if p_shift not in ('AM','PM') or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 150 then raise exception 'Invalid checklist sync'; end if;
 -- Lock by checklist so the normal app updater and sync cannot overwrite one another.
 insert into public.nest_checklists(work_date,shift,tasks,started_by)
 select p_date,p_shift,jsonb_agg(jsonb_build_object('id',r->>'id','label',r->>'label','status',case when (r->>'checked')::boolean then 'done' when r->>'note' ~* '^N/?A([ :.-]|$)' then 'na' else 'todo' end,'note',r->>'note','version',0,'updated_by','Google Sheets import','updated_at',null)),'Google Sheets import' from jsonb_array_elements(p_rows) r on conflict do nothing;
 select * into run from public.nest_checklists where work_date=p_date and shift=p_shift for update;
 insert into public.nest_checklist_sheet_state(work_date,shift,sheet_id) values(p_date,p_shift,p_sheet_id) on conflict do nothing;
 select * into state from public.nest_checklist_sheet_state where work_date=p_date and shift=p_shift for update;
 if state.sheet_id<>p_sheet_id then return jsonb_build_object('writes','[]'::jsonb,'conflicts',jsonb_build_array('A different sheet is already linked to this shift.')); end if;
 base=state.baseline;
 for incoming in select * from jsonb_array_elements(p_rows) loop
  select value,(ordinality-1)::int into task,idx from jsonb_array_elements(run.tasks) with ordinality where value->>'id'=incoming->>'id';
  if task is null or btrim(task->>'label')<>btrim(incoming->>'label') then conflicts=conflicts||jsonb_build_array('Task labels changed: '||(incoming->>'label'));continue;end if;
  sheet_value=jsonb_build_object('checked',(incoming->>'checked')::boolean,'note',incoming->>'note');
  app_value=jsonb_build_object('checked',task->>'status'='done','note',case when task->>'status'='na' and not (task->>'note' ~* '^N/?A([ :.-]|$)') then 'N/A: '||(task->>'note') else task->>'note' end);
  old_value=base->(incoming->>'id');
  if sheet_value=app_value then base=jsonb_set(base,array[incoming->>'id'],sheet_value,true);
  elsif old_value is not null and sheet_value=old_value then
   writes=writes||jsonb_build_array(jsonb_build_object('row',incoming->'row','label',incoming->>'label','expected',sheet_value,'value',app_value));
  elsif run.submitted_at is not null then conflicts=conflicts||jsonb_build_array('Completed shift is locked: '||(task->>'label'));
  elsif (old_value is not null and app_value=old_value) or (old_value is null and (task->>'version')::int=0 and task->>'status'='todo' and coalesce(task->>'note','')='') then
   next_task=task||jsonb_build_object('status',case when (incoming->>'checked')::boolean then 'done' when incoming->>'note' ~* '^N/?A([ :.-]|$)' then 'na' else 'todo' end,'note',incoming->>'note','version',(task->>'version')::int+1,'updated_by','Google Sheets','updated_at',now());
   run.tasks=jsonb_set(run.tasks,array[idx::text],next_task);count_imported=count_imported+1;
   insert into public.nest_checklist_events(work_date,shift,task_id,action,actor,detail) values(p_date,p_shift,incoming->>'id','sheet-sync','google-sheets',jsonb_build_object('before',task,'after',next_task));
   base=jsonb_set(base,array[incoming->>'id'],sheet_value,true);
  else conflicts=conflicts||jsonb_build_array('Both copies changed: '||(task->>'label'));
  end if;
 end loop;
 if jsonb_array_length(run.tasks)<>jsonb_array_length(p_rows) then conflicts=conflicts||jsonb_build_array('Task counts differ; unmatched tasks were preserved.');end if;
 update public.nest_checklists set tasks=run.tasks where work_date=p_date and shift=p_shift;
 update public.nest_checklist_sheet_state set baseline=base,sync_error=case when jsonb_array_length(conflicts)>0 then conflicts::text else null end,updated_at=now() where work_date=p_date and shift=p_shift;
 return jsonb_build_object('writes',writes,'conflicts',conflicts,'imported',count_imported);
end $$;
revoke all on function public.nest_sync_checklist(date,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.nest_sync_checklist(date,text,bigint,jsonb) to service_role;
