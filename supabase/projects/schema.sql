create table public.nest_projects (
 id uuid primary key, body jsonb not null, revision integer not null default 1,
 created_by text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.nest_project_requests (
 id uuid primary key, username text not null, display_name text not null,
 title text not null, details text not null, priority text not null, due_date text not null default '',
 status text not null default 'Pending' check(status in ('Pending','Approved','Declined')),
 review_note text not null default '', reviewed_by text, reviewed_at timestamptz,
 project_id uuid references public.nest_projects(id), created_at timestamptz not null default now()
);
create table public.nest_project_comments (
 id uuid primary key, project_id uuid not null references public.nest_projects(id),
 username text not null, display_name text not null, message text not null, created_at timestamptz not null default now()
);
alter table public.nest_projects enable row level security;
alter table public.nest_project_requests enable row level security;
alter table public.nest_project_comments enable row level security;
revoke all on public.nest_projects,public.nest_project_requests,public.nest_project_comments from public,anon,authenticated;
grant select,insert,update on public.nest_projects,public.nest_project_requests,public.nest_project_comments to service_role;
create index nest_project_requests_owner on public.nest_project_requests(username,created_at desc);
create index nest_project_comments_project on public.nest_project_comments(project_id,created_at);
create function public.nest_review_project_request(request_id uuid, actor text, decision text, note text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare req nest_project_requests; p nest_projects;
begin
 if actor not in ('eric','jess') or decision not in ('Approved','Declined') then raise exception 'Not authorized'; end if;
 select * into req from nest_project_requests where id=request_id for update;
 if not found then return jsonb_build_object('error','Request not found','status',404); end if;
 if req.status <> 'Pending' then return jsonb_build_object('error','This request has already been reviewed. Refresh to see the decision.','status',409); end if;
 if decision='Approved' then
  insert into nest_projects(id,body,created_by) values(req.id,jsonb_build_object('title',req.title,'description',req.details,'owner',actor,'due',req.due_date,'priority',req.priority,'status','To Do','tasks','[]'::jsonb),actor) returning * into p;
 end if;
 update nest_project_requests set status=decision,review_note=note,reviewed_by=actor,reviewed_at=now(),project_id=case when decision='Approved' then p.id else null end where id=request_id;
 return jsonb_build_object('ok',true,'projectId',p.id);
end $$;
revoke all on function public.nest_review_project_request(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.nest_review_project_request(uuid,text,text,text) to service_role;
