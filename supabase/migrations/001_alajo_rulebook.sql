-- Alajo rule-book foundation.
-- Money is stored in kobo (integer), never floating point.

create table if not exists public.alajo_rule_config (
  id bigint generated always as identity primary key,
  cycle_months integer not null check (cycle_months in (6, 10)),
  grace_days integer not null default 3 check (grace_days >= 0),
  max_active_groups integer not null default 3 check (max_active_groups > 0),
  waiting_list_enabled boolean not null default true,
  reserve_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (cycle_months)
);

insert into public.alajo_rule_config (cycle_months)
values (6), (10)
on conflict (cycle_months) do nothing;

create table if not exists public.alajo_group_rules (
  id uuid primary key default gen_random_uuid(),
  cycle_months integer not null check (cycle_months in (6, 10)),
  contribution_kobo bigint not null check (contribution_kobo > 0),
  member_slots integer not null check (member_slots = cycle_months),
  grace_days integer not null default 3 check (grace_days >= 0),
  reserve_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.alajo_member_obligations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  member_id uuid not null,
  cycle_number integer not null check (cycle_number > 0),
  due_at timestamptz not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  status text not null default 'pending' check (status in ('pending','paid','grace','defaulted','recovered')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_id, member_id, cycle_number)
);

create table if not exists public.alajo_payouts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  member_id uuid not null,
  cycle_number integer not null check (cycle_number > 0),
  amount_kobo bigint not null check (amount_kobo > 0),
  status text not null default 'pending' check (status in ('pending','funded','processing','paid','failed','shortfall')),
  transaction_reference text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_id, member_id, cycle_number)
);

create table if not exists public.alajo_shortfalls (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  cycle_number integer not null check (cycle_number > 0),
  expected_kobo bigint not null check (expected_kobo > 0),
  funded_kobo bigint not null default 0 check (funded_kobo >= 0),
  outstanding_kobo bigint generated always as (greatest(expected_kobo - funded_kobo, 0)) stored,
  status text not null default 'open' check (status in ('open','recovering','covered','resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.alajo_replacements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  original_member_id uuid not null,
  replacement_member_id uuid,
  cycle_number integer not null check (cycle_number > 0),
  status text not null default 'replacement_pending' check (status in ('replacement_pending','approved','active','cancelled')),
  catch_up_kobo bigint not null default 0 check (catch_up_kobo >= 0),
  created_at timestamptz not null default now(),
  activated_at timestamptz
);

create table if not exists public.alajo_financial_audit_log (
  id uuid primary key default gen_random_uuid(),
  group_id uuid,
  member_id uuid,
  event_type text not null,
  amount_kobo bigint,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_alajo_obligations_group_cycle on public.alajo_member_obligations(group_id, cycle_number);
create index if not exists idx_alajo_obligations_member_status on public.alajo_member_obligations(member_id, status);
create index if not exists idx_alajo_payouts_group_cycle on public.alajo_payouts(group_id, cycle_number);
create index if not exists idx_alajo_shortfalls_group_status on public.alajo_shortfalls(group_id, status);
