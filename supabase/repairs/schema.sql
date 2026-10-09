create table public.nest_repairs (
 id uuid primary key, username text not null, display_name text not null,
 area text not null, location text not null default '',
 priority text not null check(priority in ('Routine','Low','Medium','High','Urgent')),
 impact text not null check(impact in ('Guest Facing','Immediate Impact','No Immediate Impact')),
 details text not null check(length(details) between 1 and 3000),
 created_at timestamptz not null default now(), synced_at timestamptz, sheet_reference text
);
create index nest_repairs_owner_date on public.nest_repairs(username,created_at desc);
create table public.nest_repair_sync (
 id boolean primary key default true check(id), key_hash text not null, last_seen timestamptz
);
alter table public.nest_repairs enable row level security;
alter table public.nest_repair_sync enable row level security;
revoke all on public.nest_repairs,public.nest_repair_sync from public,anon,authenticated;
grant select,insert,update on public.nest_repairs,public.nest_repair_sync to service_role;
