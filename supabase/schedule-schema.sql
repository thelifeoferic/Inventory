create table public.nest_schedule (
  week_start date primary key check (extract(dow from week_start)=0),
  body jsonb not null,
  revision integer not null default 1 check (revision>0),
  updated_by text not null,
  updated_at timestamptz not null default now()
);
alter table public.nest_schedule enable row level security;
revoke all on public.nest_schedule from public, anon, authenticated;
grant select,insert,update on public.nest_schedule to service_role;
