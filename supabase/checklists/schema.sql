create table public.nest_checklists (
  work_date date not null,
  shift text not null check (shift in ('AM','PM')),
  tasks jsonb not null check (jsonb_typeof(tasks)='array'),
  started_by text not null,
  started_at timestamptz not null default now(),
  submitted_by text,
  submitted_at timestamptz,
  primary key (work_date,shift)
);
create table public.nest_checklist_events (
  id bigint generated always as identity primary key,
  work_date date not null,
  shift text not null,
  task_id text,
  action text not null,
  actor text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.nest_checklists enable row level security;
alter table public.nest_checklist_events enable row level security;
revoke all on public.nest_checklists,public.nest_checklist_events from public,anon,authenticated;
grant select,insert,update on public.nest_checklists to service_role;
grant select,insert on public.nest_checklist_events to service_role;
grant usage,select on sequence public.nest_checklist_events_id_seq to service_role;
create function public.nest_checklist_change(p_date date,p_shift text,p_action text,p_actor text,p_display text,p_manager boolean,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare run public.nest_checklists%rowtype; task jsonb; idx integer; next_task jsonb;
begin
  if p_shift not in ('AM','PM') then return jsonb_build_object('error','Invalid shift.','status',400); end if;
  if p_action='start' then
    insert into public.nest_checklists(work_date,shift,tasks,started_by)
    values(p_date,p_shift,p_data->'tasks',p_display) on conflict do nothing;
  end if;
  select * into run from public.nest_checklists where work_date=p_date and shift=p_shift for update;
  if not found then return jsonb_build_object('error','Start this shift first.','status',404); end if;
  if p_action='start' then return jsonb_build_object('run',to_jsonb(run)); end if;
  if p_action='reopen' then
    if not p_manager then return jsonb_build_object('error','Only Eric can reopen a completed shift.','status',403); end if;
    update public.nest_checklists set submitted_at=null,submitted_by=null where work_date=p_date and shift=p_shift;
  else
    if run.submitted_at is not null then return jsonb_build_object('error','This shift is complete. Ask Eric to reopen it.','status',409); end if;
    if p_action='submit' then
      if exists(select 1 from jsonb_array_elements(run.tasks) t where t->>'status'='todo') then return jsonb_build_object('error','Complete each task or mark it not applicable before finishing.','status',400); end if;
      update public.nest_checklists set submitted_at=now(),submitted_by=p_display where work_date=p_date and shift=p_shift;
    elsif p_action='task' then
      select value,(ordinality-1)::integer into task,idx from jsonb_array_elements(run.tasks) with ordinality where value->>'id'=p_data->>'id';
      if task is null then return jsonb_build_object('error','Task not found.','status',404); end if;
      if (task->>'version')::integer <> (p_data->>'version')::integer then return jsonb_build_object('error','A teammate updated this task. Reload to see their changes before trying again.','status',409); end if;
      if p_data->>'status' not in ('todo','done','na') or length(coalesce(p_data->>'note',''))>2000 then return jsonb_build_object('error','Invalid task update.','status',400); end if;
      if p_data->>'status'='na' and btrim(coalesce(p_data->>'note',''))='' then return jsonb_build_object('error','Add a reason for marking this task not applicable.','status',400); end if;
      next_task=task||jsonb_build_object('status',p_data->>'status','note',p_data->>'note','updated_by',p_display,'updated_at',now(),'version',(task->>'version')::integer+1);
      update public.nest_checklists set tasks=jsonb_set(tasks,array[idx::text],next_task) where work_date=p_date and shift=p_shift;
    else return jsonb_build_object('error','Invalid action.','status',400);
    end if;
  end if;
  insert into public.nest_checklist_events(work_date,shift,task_id,action,actor,detail) values(p_date,p_shift,p_data->>'id',p_action,p_actor,case when p_action='task' then jsonb_build_object('before',task,'after',next_task) else '{}'::jsonb end);
  select * into run from public.nest_checklists where work_date=p_date and shift=p_shift;
  return jsonb_build_object('run',to_jsonb(run));
end $$;
revoke all on function public.nest_checklist_change(date,text,text,text,text,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.nest_checklist_change(date,text,text,text,text,boolean,jsonb) to service_role;
