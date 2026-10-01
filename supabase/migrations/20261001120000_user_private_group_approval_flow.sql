create or replace function public.create_private_group_request(
  p_name text, p_description text, p_contribution_amount numeric,
  p_start_date date, p_cycle public.group_cycle
) returns public.groups
language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid := auth.uid(); v_group public.groups%rowtype;
  v_months integer; v_finish date;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_name is null or length(trim(p_name))=0 or length(trim(p_name))>120 then raise exception 'INVALID_GROUP_NAME'; end if;
  if p_contribution_amount is null or p_contribution_amount<=0 then raise exception 'INVALID_CONTRIBUTION_AMOUNT'; end if;
  if p_start_date is null or p_start_date<=current_date or extract(day from p_start_date)<>1 then raise exception 'GROUP_START_MUST_BE_FUTURE_FIRST_OF_MONTH'; end if;
  if p_cycle not in ('six_month'::public.group_cycle,'ten_month'::public.group_cycle) then raise exception 'GROUP_CYCLE_MUST_BE_SIX_OR_TEN_MONTHS'; end if;
  v_months := case when p_cycle='six_month'::public.group_cycle then 6 else 10 end;
  v_finish := ((p_start_date + make_interval(months=>v_months-1))::date + 28);
  if extract(year from v_finish)<>extract(year from p_start_date) then raise exception 'GROUP_CYCLE_CANNOT_CROSS_CALENDAR_YEAR'; end if;
  insert into public.groups(name,description,cycle,contribution_amount,slot_count,start_date,close_date,contribution_due_day,finish_date,status,lifecycle_managed,created_by,is_private,invite_token,approval_status)
  values(trim(p_name),nullif(trim(p_description),''),p_cycle,p_contribution_amount,v_months,p_start_date,p_start_date-1,29,v_finish,'draft'::public.group_status,true,v_user,true,gen_random_uuid(),'pending')
  returning * into v_group;
  insert into public.group_slots(group_id,position,status)
  select v_group.id,s,'available'::public.slot_status from generate_series(1,v_months) s;
  return v_group;
end;
$$;

create or replace function public.admin_approve_group_request(p_group_id uuid)
returns public.groups language plpgsql security definer set search_path=''
as $$
declare
  v_group public.groups%rowtype; v_role public.admin_role; v_months integer; v_finish date;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select ur.role into v_role from public.user_roles ur where ur.user_id=auth.uid();
  if v_role is null then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_group from public.groups where id=p_group_id for update;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if v_group.approval_status <> 'pending' then raise exception 'GROUP_NOT_PENDING_APPROVAL'; end if;
  if not v_group.is_private then raise exception 'GROUP_NOT_PRIVATE_REQUEST'; end if;
  if v_group.cycle not in ('six_month'::public.group_cycle,'ten_month'::public.group_cycle) then raise exception 'GROUP_CYCLE_MUST_BE_SIX_OR_TEN_MONTHS'; end if;
  v_months := case when v_group.cycle='six_month'::public.group_cycle then 6 else 10 end;
  v_finish := ((v_group.start_date + make_interval(months=>v_months-1))::date + 28);
  if v_group.start_date is null or v_group.start_date<=current_date or extract(day from v_group.start_date)<>1 then raise exception 'INVALID_GROUP_START_DATE'; end if;
  if extract(year from v_finish)<>extract(year from v_group.start_date) then raise exception 'GROUP_CYCLE_CANNOT_CROSS_CALENDAR_YEAR'; end if;
  if exists(select 1 from public.group_slots where group_id=p_group_id) then raise exception 'GROUP_SLOTS_ALREADY_EXIST'; end if;
  insert into public.group_slots(group_id,position,status)
  select p_group_id,s,'available'::public.slot_status from generate_series(1,v_months) s;
  update public.groups set status='open'::public.group_status,approval_status='approved',approval_note=null,updated_at=now(),finish_date=v_finish,slot_count=v_months,finalized_member_count=null,finalized_at=null where id=p_group_id returning * into v_group;
  return v_group;
end;
$$;

create or replace function public.admin_approve_group_request(p_group_id uuid)
returns public.groups language plpgsql security definer set search_path=''
as $$
declare
  v_group public.groups%rowtype; v_role public.admin_role; v_months integer; v_finish date; v_filled integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select ur.role into v_role from public.user_roles ur where ur.user_id=auth.uid();
  if v_role is null then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_group from public.groups where id=p_group_id for update;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if v_group.approval_status <> 'pending' then raise exception 'GROUP_NOT_PENDING_APPROVAL'; end if;
  if not v_group.is_private then raise exception 'GROUP_NOT_PRIVATE_REQUEST'; end if;
  if v_group.cycle not in ('six_month'::public.group_cycle,'ten_month'::public.group_cycle) then raise exception 'GROUP_CYCLE_MUST_BE_SIX_OR_TEN_MONTHS'; end if;
  v_months := case when v_group.cycle='six_month'::public.group_cycle then 6 else 10 end;
  select count(*) into v_filled from public.group_members where group_id=p_group_id and status::text in ('pending','active');
  if v_filled <> v_months then raise exception 'GROUP_MUST_BE_FULL_BEFORE_APPROVAL'; end if;
  if v_group.start_date is null or v_group.start_date<=current_date or extract(day from v_group.start_date)<>1 then raise exception 'INVALID_GROUP_START_DATE'; end if;
  v_finish := ((v_group.start_date + make_interval(months=>v_months-1))::date + 28);
  if extract(year from v_finish)<>extract(year from v_group.start_date) then raise exception 'GROUP_CYCLE_CANNOT_CROSS_CALENDAR_YEAR'; end if;
  if exists(select 1 from public.group_slots where group_id=p_group_id and status='available'::public.slot_status) then raise exception 'GROUP_MUST_HAVE_ALL_SLOTS_FILLED'; end if;
  update public.group_slots set status='assigned'::public.slot_status where group_id=p_group_id and reserved_by is not null;
  update public.group_members set status='active'::public.membership_status,activated_at=coalesce(activated_at,now()) where group_id=p_group_id and status='pending'::public.membership_status;
  update public.groups set status='active'::public.group_status,approval_status='approved',approval_note=null,updated_at=now(),finish_date=v_finish,slot_count=v_months,finalized_member_count=v_months,finalized_at=now() where id=p_group_id returning * into v_group;
  return v_group;
end;
$$;

create or replace function public.admin_reject_group_request(p_group_id uuid,p_reason text default null)
returns public.groups language plpgsql security definer set search_path=''
as $$
declare v_group public.groups%rowtype; v_role public.admin_role;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select ur.role into v_role from public.user_roles ur where ur.user_id=auth.uid();
  if v_role is null then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_group from public.groups where id=p_group_id for update;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if v_group.approval_status <> 'pending' then raise exception 'GROUP_NOT_PENDING_APPROVAL'; end if;
  update public.groups set approval_status='rejected',approval_note=nullif(trim(p_reason),''),status='cancelled'::public.group_status,updated_at=now() where id=p_group_id returning * into v_group;
  return v_group;
end;
$$;

create or replace function public.join_private_group_by_invite(p_invite_token uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid:=auth.uid(); v_group public.groups%rowtype; v_slot public.group_slots%rowtype;
  v_membership public.group_members%rowtype; v_count integer; v_max_groups integer; v_full boolean;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_group from public.groups where invite_token=p_invite_token and is_private=true for update;
  if not found then raise exception 'PRIVATE_GROUP_NOT_FOUND'; end if;
  if v_group.approval_status<>'pending' or v_group.status not in ('draft','full') then raise exception 'PRIVATE_GROUP_NOT_AVAILABLE'; end if;
  select greatest(1,least(coalesce(integer_value,3),3)) into v_max_groups from public.system_settings where key='max_active_groups';
  v_max_groups:=coalesce(v_max_groups,3);
  if exists(select 1 from public.group_members where group_id=v_group.id and user_id=v_user and status::text not in ('replaced','cancelled')) then raise exception 'ALREADY_A_MEMBER'; end if;
  select count(*) into v_count from public.group_members where user_id=v_user and status::text in ('pending','active');
  if v_count>=v_max_groups then raise exception 'MAX_ACTIVE_GROUPS'; end if;
  select * into v_slot from public.group_slots where group_id=v_group.id and status='available'::public.slot_status order by position limit 1 for update skip locked;
  if not found then raise exception 'NO_AVAILABLE_SLOTS'; end if;
  insert into public.group_members(group_id,user_id,slot_id,status,joined_at) values(v_group.id,v_user,v_slot.id,'pending'::public.membership_status,now()) returning * into v_membership;
  update public.group_slots set status='assigned'::public.slot_status,reserved_by=v_user,reserved_until=null where id=v_slot.id;
  select not exists(select 1 from public.group_slots where group_id=v_group.id and status='available'::public.slot_status) into v_full;
  if v_full then update public.groups set status='full'::public.group_status,updated_at=now() where id=v_group.id; end if;
  return jsonb_build_object('membership_id',v_membership.id,'group_id',v_group.id,'slot_id',v_slot.id,'position',v_slot.position,'status',v_membership.status::text,'group_status',case when v_full then 'full' else 'filling' end);
end;
$$;

drop policy if exists groups_select_authenticated on public.groups;
create policy groups_select_authenticated on public.groups for select to authenticated
using (
  status in ('open'::public.group_status,'full'::public.group_status,'active'::public.group_status,'paused'::public.group_status,'completed'::public.group_status)
  and (not is_private or created_by=(select auth.uid()) or exists(select 1 from public.group_members gm where gm.group_id=groups.id and gm.user_id=(select auth.uid()) and gm.status::text not in ('replaced','cancelled')))
);

drop policy if exists group_slots_select_authenticated on public.group_slots;
create policy group_slots_select_authenticated on public.group_slots for select to authenticated
using (
  exists(select 1 from public.groups g where g.id=group_slots.group_id and g.status in ('open'::public.group_status,'full'::public.group_status,'active'::public.group_status,'paused'::public.group_status,'completed'::public.group_status)
    and (not g.is_private or g.created_by=(select auth.uid()) or exists(select 1 from public.group_members gm where gm.group_id=g.id and gm.user_id=(select auth.uid()) and gm.status::text not in ('replaced','cancelled'))))
);

revoke execute on function public.create_private_group_request(text,text,numeric,date,public.group_cycle) from public,anon;
grant execute on function public.create_private_group_request(text,text,numeric,date,public.group_cycle) to authenticated;
revoke execute on function public.admin_approve_group_request(uuid) from public,anon,authenticated;
grant execute on function public.admin_approve_group_request(uuid) to authenticated;
revoke execute on function public.admin_reject_group_request(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_reject_group_request(uuid,text) to authenticated;
revoke execute on function public.join_private_group_by_invite(uuid) from public,anon;
grant execute on function public.join_private_group_by_invite(uuid) to authenticated;
