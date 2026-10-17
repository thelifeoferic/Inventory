create table public.nest_labor_rates (
 member_id text not null,
 effective_from date not null,
 hourly_rate numeric(10,2) not null check(hourly_rate>=0 and hourly_rate<=10000),
 unpaid_break_minutes integer check(unpaid_break_minutes between 0 and 120),
 updated_by text not null,
 updated_at timestamptz not null default now(),
 primary key(member_id,effective_from)
);
alter table public.nest_labor_rates enable row level security;
revoke all on public.nest_labor_rates from public,anon,authenticated;
grant select,insert,update on public.nest_labor_rates to service_role;
