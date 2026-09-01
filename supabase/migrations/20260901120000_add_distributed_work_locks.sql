-- Distributed anti-stampede locks for serverless runtimes.
-- These locks coordinate work across Vercel instances; they are never the source of financial truth.
create table if not exists public.distributed_work_locks (
  lock_key text primary key,
  owner_id uuid not null,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists distributed_work_locks_expires_idx on public.distributed_work_locks (expires_at);
alter table public.distributed_work_locks enable row level security;
revoke all on public.distributed_work_locks from anon, authenticated;

authorize? 
