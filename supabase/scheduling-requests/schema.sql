create table if not exists public.nest_scheduling_requests (
 id uuid primary key,
 username text not null,
 display_name text not null,
 kind text not null check (kind in ('Time off','Shift change','Availability','Other')),
 start_date date not null,
 end_date date not null check (end_date >= start_date),
 details text not null check (length(details) between 1 and 3000),
 reply_email text not null default '',
 created_at timestamptz not null default now(),
 email_status text not null default 'pending' check (email_status in ('pending','sent')),
 emailed_at timestamptz
);
create index if not exists nest_scheduling_requests_owner_date on public.nest_scheduling_requests(username,created_at desc);
alter table public.nest_scheduling_requests enable row level security;
revoke all on public.nest_scheduling_requests from public,anon,authenticated;
grant select,insert,update on public.nest_scheduling_requests to service_role;
