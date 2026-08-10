revoke execute on function public.pay_contribution(uuid) from public, anon;
grant execute on function public.pay_contribution(uuid) to authenticated;

create or replace function public.pay_contribution(p_schedule_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user uuid := auth.uid();
  v_schedule public.contribution_schedules;
  v_member public.group_members;
  v_wallet public.wallets;
  v_payment_id uuid;
  v_ledger_id uuid;
  v_amount numeric;
  v_reference text;
  v_new_balance numeric;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select cs.* into v_schedule
  from public.contribution_schedules cs
  join public.group_members gm on gm.id = cs.group_member_id
  where cs.id = p_schedule_id and gm.user_id = v_user
  for update;

  if not found then raise exception 'CONTRIBUTION_NOT_FOUND'; end if;
  if v_schedule.status not in ('pending','overdue') then raise exception 'CONTRIBUTION_NOT_PAYABLE'; end if;

  v_amount := v_schedule.outstanding_amount;
  if v_amount <= 0 then raise exception 'INVALID_OUTSTANDING_AMOUNT'; end if;
  if v_schedule.outstanding_amount <> v_schedule.amount then raise exception 'PARTIAL_PAYMENT_NOT_SUPPORTED'; end if;

  select * into v_member from public.group_members
  where id = v_schedule.group_member_id and user_id = v_user for update;
  if not found then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;

  select * into v_wallet from public.wallets where user_id = v_user for update;
  if not found then raise exception 'WALLET_NOT_FOUND'; end if;
  if v_wallet.balance < v_amount then raise exception 'INSUFFICIENT_WALLET_BALANCE'; end if;

  v_payment_id := gen_random_uuid();
  v_reference := 'wallet-contribution-' || p_schedule_id::text;

  insert into public.payments (id,user_id,group_id,contribution_id,amount,currency,provider,provider_reference,status,metadata,created_at,updated_at)
  values (v_payment_id,v_user,v_member.group_id,p_schedule_id,v_amount,v_wallet.currency,'wallet',v_reference,'succeeded',jsonb_build_object('source','alajo_wallet','schedule_id',p_schedule_id),now(),now());

  update public.wallets set balance=balance-v_amount, updated_at=now() where id=v_wallet.id returning balance into v_new_balance;

  update public.contribution_schedules set outstanding_amount=0,status='paid',paid_at=now(),updated_at=now() where id=p_schedule_id;

  insert into public.ledger_transactions (id,user_id,group_id,type,status,amount,currency,payment_id,description,metadata,created_at)
  values (gen_random_uuid(),v_user,v_member.group_id,'contribution','posted',v_amount,v_wallet.currency,v_payment_id,'Contribution payment from Alajo wallet',jsonb_build_object('schedule_id',p_schedule_id,'period_number',v_schedule.period_number,'source','wallet'),now())
  returning id into v_ledger_id;

  insert into public.notifications (user_id,type,title,body,metadata,created_at)
  values (v_user,'contribution_paid','Contribution payment successful','Your contribution for period ' || v_schedule.period_number || ' has been paid successfully.',jsonb_build_object('schedule_id',p_schedule_id,'payment_id',v_payment_id,'transaction_id',v_ledger_id,'amount',v_amount,'currency',v_wallet.currency),now());

  insert into public.audit_logs (actor_user_id,action,entity_type,entity_id,previous_state,new_state,reason,created_at)
  values (v_user,'contribution_paid','contribution_schedule',p_schedule_id,jsonb_build_object('status',v_schedule.status,'outstanding_amount',v_schedule.outstanding_amount),jsonb_build_object('status','paid','outstanding_amount',0,'payment_id',v_payment_id,'transaction_id',v_ledger_id),'Wallet contribution payment',now());

  return jsonb_build_object('success',true,'schedule_id',p_schedule_id,'payment_id',v_payment_id,'transaction_id',v_ledger_id,'wallet_balance',v_new_balance,'amount',v_amount,'status','paid');
end;
$function$;
