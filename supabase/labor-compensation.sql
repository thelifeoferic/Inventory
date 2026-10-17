alter table public.nest_labor_rates add column compensation_type text not null default 'hourly' check(compensation_type in ('hourly','salary'));
