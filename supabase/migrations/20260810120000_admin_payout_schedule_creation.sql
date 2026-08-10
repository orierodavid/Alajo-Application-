create or replace function public.admin_create_payout_schedule(p_group_id uuid, p_group_member_id uuid, p_period_number integer, p_scheduled_date date, p_expected_amount numeric)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare v_payout public.payouts; v_cycle smallint; v_status text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role::text='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  if p_period_number < 1 then raise exception 'INVALID_PERIOD'; end if;
  if p_scheduled_date is null then raise exception 'SCHEDULED_DATE_REQUIRED'; end if;
  if p_expected_amount is null or p_expected_amount <= 0 then raise exception 'INVALID_EXPECTED_AMOUNT'; end if;
  select sg.cycle_months into v_cycle from public.savings_groups sg where sg.id=p_group_id for update;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if p_period_number > v_cycle then raise exception 'INVALID_PERIOD'; end if;
  if not exists (select 1 from public.group_members gm where gm.id=p_group_member_id and gm.group_id=p_group_id and gm.status::text in ('active','pending')) then raise exception 'BENEFICIARY_NOT_FOUND'; end if;
  select p.status::text into v_status from public.payouts p where p.group_id=p_group_id and p.period_number=p_period_number for update;
  if v_status in ('paid','processing') then raise exception 'PAYOUT_ALREADY_IN_PROGRESS'; end if;
  insert into public.payouts(group_id,group_member_id,period_number,scheduled_date,expected_amount,funded_amount,shortfall_amount,status)
  values(p_group_id,p_group_member_id,p_period_number,p_scheduled_date,p_expected_amount,0,p_expected_amount,'scheduled')
  on conflict(group_id,period_number) do update set group_member_id=excluded.group_member_id,scheduled_date=excluded.scheduled_date,expected_amount=excluded.expected_amount,funded_amount=0,shortfall_amount=excluded.expected_amount,status='scheduled',provider=null,provider_reference=null,paid_at=null,failure_reason=null,updated_at=now()
  returning * into v_payout;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,new_state,reason)
  values(auth.uid(),'payout_schedule_created','payout',v_payout.id,jsonb_build_object('group_id',p_group_id,'group_member_id',p_group_member_id,'period_number',p_period_number,'scheduled_date',p_scheduled_date,'expected_amount',p_expected_amount),'Admin-created payout schedule');
  return v_payout;
end;
$$;
revoke all on function public.admin_create_payout_schedule(uuid,uuid,integer,date,numeric) from public, anon;
grant execute on function public.admin_create_payout_schedule(uuid,uuid,integer,date,numeric) to authenticated;

create or replace function public.admin_list_payout_context()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role::text='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  select jsonb_build_object(
    'groups', coalesce((select jsonb_agg(to_jsonb(sg) order by sg.created_at desc) from public.savings_groups sg),'[]'::jsonb),
    'members', coalesce((select jsonb_agg(to_jsonb(gm) order by gm.joined_at asc) from public.group_members gm),'[]'::jsonb),
    'payouts', coalesce((select jsonb_agg(to_jsonb(p) order by p.scheduled_date asc) from public.payouts p),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.admin_list_payout_context() from public, anon;
grant execute on function public.admin_list_payout_context() to authenticated;
