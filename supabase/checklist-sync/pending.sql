create function public.nest_checklist_sync_pending() returns table(work_date date,shift text) language sql security invoker set search_path='' as $$
 select r.work_date,r.shift from public.nest_checklists r left join public.nest_checklist_sheet_state s using(work_date,shift)
 where s.work_date is null or exists(select 1 from jsonb_array_elements(r.tasks) t where s.baseline->(t->>'id') is distinct from jsonb_build_object('checked',t->>'status'='done','note',case when t->>'status'='na' and not(t->>'note' ~* '^N/?A([ :.-]|$)') then 'N/A: '||(t->>'note') else t->>'note' end)) order by r.work_date desc limit 100;
$$;
create function public.nest_checklist_link_blank(p_date date,p_shift text,p_sheet_id bigint,p_rows jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from jsonb_array_elements(p_rows) r where (r->>'checked')::boolean or r->>'note'<>'') then raise exception 'New sheet is not blank';end if;
 insert into public.nest_checklist_sheet_state(work_date,shift,sheet_id,baseline) select p_date,p_shift,p_sheet_id,jsonb_object_agg(r->>'id',jsonb_build_object('checked',false,'note','')) from jsonb_array_elements(p_rows) r on conflict do nothing;
 return '{}'::jsonb;
end $$;
revoke all on function public.nest_checklist_sync_pending() from public,anon,authenticated;
revoke all on function public.nest_checklist_link_blank(date,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.nest_checklist_sync_pending(),public.nest_checklist_link_blank(date,text,bigint,jsonb) to service_role;
