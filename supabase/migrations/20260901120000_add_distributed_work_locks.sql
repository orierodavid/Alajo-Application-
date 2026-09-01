-- Distributed anti-stampede locks for serverless runtimes.
-- These locks coordinate work across Vercel instances; they are never the source of financial truth.
create table if not exists public.distributed_work_locks (
  lock_key text primary key,
  owner_id uuid not null,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists distributed_work_locks_expires_idx
  on public.distributed_work_locks (expires_at);

alter table public.distributed_work_locks enable row level security;

revoke all on public.distributed_work_locks from anon, authenticated;

authorize? 

create or replace function public.try_acquire_work_lock(
  p_lock_key text,
  p_owner_id uuid,
  p_lease_seconds integer default 30
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare acquired boolean;
begin
  insert into public.distributed_work_locks(lock_key, owner_id, expires_at)
  values (p_lock_key, p_owner_id, now() + make_interval(secs => greatest(1,p_lease_seconds)))
  on conflict (lock_key) do update
    set owner_id = excluded.owner_id,
        acquired_at = now(),
        expires_at = excluded.expires_at,
        updated_at = now()
    where distributed_work_locks.expires_at <= now()
  returning true into acquired;
  return coalesce(acquired, false);
end;
$$;

create or replace function public.release_work_lock(
  p_lock_key text,
  p_owner_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  delete from public.distributed_work_locks
  where lock_key = p_lock_key and owner_id = p_owner_id
  returning true;
$$;

grant execute on function public.try_acquire_work_lock(text,uuid,integer) to service_role;
grant execute on function public.release_work_lock(text,uuid) to service_role;
