-- Alajo Groups & Membership foundation
-- All monetary values are stored as integer kobo.

create table if not exists public.savings_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cycle_months smallint not null check (cycle_months in (6,10)),
  contribution_kobo bigint not null check (contribution_kobo > 0),
  capacity smallint not null check (capacity > 0),
  status text not null default 'open' check (status in ('draft','open','full','active','completed','cancelled')),
  starts_on date,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.savings_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position smallint not null,
  status text not null default 'active' check (status in ('pending','active','defaulted','replaced','completed','removed')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id),
  unique (group_id, position)
);

create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_group_members_group on public.group_members(group_id);

alter table public.savings_groups enable row level security;
alter table public.group_members enable row level security;

create or replace function public.join_savings_group(p_group_id uuid, p_position smallint)
returns public.group_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.savings_groups;
  v_member public.group_members;
  v_count integer;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_group from public.savings_groups where id = p_group_id for update;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if v_group.status not in ('open','full') then raise exception 'GROUP_NOT_OPEN'; end if;
  if p_position < 1 or p_position > v_group.capacity then raise exception 'INVALID_POSITION'; end if;

  select count(*) into v_count from public.group_members where group_id = p_group_id and status in ('pending','active');
  if v_count >= v_group.capacity then raise exception 'GROUP_FULL'; end if;

  if exists (select 1 from public.group_members where group_id = p_group_id and position = p_position and status in ('pending','active')) then
    raise exception 'POSITION_TAKEN';
  end if;

  if (select count(*) from public.group_members where user_id = v_user and status in ('pending','active')) >= 3 then
    raise exception 'MAX_ACTIVE_GROUPS';
  end if;

  if exists (select 1 from public.group_members where group_id = p_group_id and user_id = v_user and status not in ('replaced','removed')) then
    raise exception 'ALREADY_A_MEMBER';
  end if;

  insert into public.group_members(group_id,user_id,position,status)
  values (p_group_id,v_user,p_position,'active') returning * into v_member;

  update public.savings_groups
  set status = case when v_count + 1 >= capacity then 'full' else 'open' end
  where id = p_group_id;

  return v_member;
end;
$$;

grant execute on function public.join_savings_group(uuid,smallint) to authenticated;
