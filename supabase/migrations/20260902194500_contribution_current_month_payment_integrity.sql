create or replace function public.pay_contribution_from_wallet(p_schedule_id uuid, p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  s public.contribution_schedules%rowtype;
  m public.group_members%rowtype;
  w public.wallets%rowtype;
  v_base numeric;
  v_service numeric := 0;
  v_delay numeric := 0;
  v_total numeric;
  v_grace_date date;
  v_now timestamptz := now();
  v_new_balance numeric;
  v_payment_id uuid := gen_random_uuid();
  v_ledger_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 or length(p_idempotency_key) > 128 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;

  select * into s from public.contribution_schedules where id = p_schedule_id for update;
  if not found then raise exception 'CONTRIBUTION_NOT_FOUND'; end if;

  select * into m from public.group_members where id = s.group_member_id and user_id = v_uid for update;
  if not found then raise exception 'CONTRIBUTION_NOT_FOUND'; end if;

  if s.status::text = 'paid' or s.settlement_status::text = 'settled' then
    return jsonb_build_object('success',true,'already_paid',true,'schedule_id',p_schedule_id);
  end if;
  if s.status::text not in ('pending','due','overdue','late','missed','grace') then raise exception 'CONTRIBUTION_NOT_PAYABLE'; end if;

  -- Manual payments are allowed only for the current calendar month.
  if date_trunc('month', s.due_date::timestamp) <> date_trunc('month', current_date::timestamp) then raise exception 'CURRENT_MONTH_ONLY'; end if;

  select * into w from public.wallets where user_id = v_uid for update;
  if not found then raise exception 'WALLET_NOT_FOUND'; end if;

  v_base := greatest(coalesce(s.amount,0),0);
  if v_base <= 0 then raise exception 'INVALID_BASE_AMOUNT'; end if;

  -- Use the actual last day of the contribution month; never construct an invalid Feb 29 date.
  v_grace_date := (date_trunc('month', s.due_date::timestamp) + interval '1 month - 1 day')::date;
  if current_date > v_grace_date then
    v_delay := round(v_base * greatest(public.get_setting_numeric('delay_fee_percentage',0),0) / 100, 2);
  end if;
  if m.service_fee_paid_at is null then
    v_service := round(v_base * greatest(public.get_setting_numeric('service_fee_percentage',0),0) / 100, 2);
  end if;
  v_total := v_base + v_service + v_delay;

  update public.contribution_schedules
  set service_fee_amount=v_service, delay_fee_amount=v_delay, total_due=v_total,
      delay_assessed_at=case when v_delay>0 then coalesce(delay_assessed_at,v_now) else delay_assessed_at end,
      status=case when current_date>v_grace_date and status::text='pending' then 'overdue' else status end,
      updated_at=v_now
  where id=s.id;

  if exists(select 1 from public.financial_ledger_entries where user_id=v_uid and idempotency_key=p_idempotency_key) then
    return jsonb_build_object('success',true,'already_processed',true,'schedule_id',p_schedule_id);
  end if;

  if coalesce(w.balance,0) < v_total then
    return jsonb_build_object('success',false,'code','INSUFFICIENT_FUNDS','required',v_total,'balance',coalesce(w.balance,0));
  end if;

  update public.wallets set balance=balance-v_total, updated_at=v_now where id=w.id returning balance into v_new_balance;

  insert into public.payments(id,user_id,group_id,contribution_id,amount,currency,provider,provider_reference,status,metadata)
  values(v_payment_id,v_uid,m.group_id,s.id,v_total,w.currency,'wallet','wallet-contribution-'||s.id::text,'succeeded',jsonb_build_object('source','manual_wallet','base_amount',v_base,'service_fee',v_service,'delay_fee',v_delay));

  insert into public.financial_ledger_entries(user_id,market_id,contribution_schedule_id,entry_type,direction,amount_minor,currency,idempotency_key,description,metadata)
  values(v_uid,null,s.id,'CONTRIBUTION_PAYMENT','DEBIT',round(v_total*100)::bigint,w.currency,p_idempotency_key,'Contribution paid from wallet',jsonb_build_object('group_member_id',m.id,'payment_method','manual_wallet','period_number',s.period_number,'base_amount',v_base,'service_fee',v_service,'delay_fee',v_delay))
  returning id into v_ledger_id;

  if v_service > 0 and m.service_fee_paid_at is null then
    update public.group_members set service_fee_paid_at=v_now, service_fee_amount=v_service, updated_at=v_now where id=m.id;
  end if;

  update public.contribution_schedules set status='paid',paid_at=v_now,outstanding_amount=0,settlement_status='settled',settled_at=v_now,updated_at=v_now where id=s.id;

  insert into public.notifications(user_id,type,title,body,metadata)
  values(v_uid,'contribution_paid','Contribution payment successful','Your contribution for period '||s.period_number||' has been paid successfully.',jsonb_build_object('schedule_id',s.id,'payment_id',v_payment_id,'transaction_id',v_ledger_id,'amount',v_total,'service_fee',v_service,'delay_fee',v_delay));

  return jsonb_build_object('success',true,'schedule_id',s.id,'payment_id',v_payment_id,'wallet_balance',v_new_balance,'amount',v_base,'service_fee',v_service,'delay_fee',v_delay,'total_paid',v_total,'status','paid');
end
$function$;

create or replace function public.auto_debit_contribution(p_schedule_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s public.contribution_schedules;
  m public.group_members;
  w public.wallets;
  service_pct numeric;
  delay_pct numeric;
  service_fee numeric := 0;
  delay_fee numeric := 0;
  total numeric;
  new_balance numeric;
  payment_id uuid := gen_random_uuid();
  ledger_id uuid;
  grace_date date;
begin
  if not public.get_setting_boolean('auto_debit_enabled', true) then return jsonb_build_object('success',false,'reason','AUTO_DEBIT_DISABLED'); end if;

  select * into s from public.contribution_schedules where id=p_schedule_id for update;
  if not found then return jsonb_build_object('success',false,'reason','CONTRIBUTION_NOT_FOUND'); end if;
  if s.status::text not in ('pending','due','overdue','late','missed','grace') then return jsonb_build_object('success',false,'reason','NOT_PAYABLE','status',s.status); end if;
  if s.due_date > current_date then return jsonb_build_object('success',false,'reason','NOT_DUE'); end if;

  select * into m from public.group_members where id=s.group_member_id for update;
  if not found then return jsonb_build_object('success',false,'reason','MEMBERSHIP_NOT_FOUND'); end if;
  if m.contribution_payment_method <> 'auto_debit' then return jsonb_build_object('success',false,'reason','AUTO_DEBIT_NOT_SELECTED'); end if;

  select * into w from public.wallets where user_id=m.user_id for update;
  if not found then return jsonb_build_object('success',false,'reason','WALLET_NOT_FOUND'); end if;

  service_pct := greatest(public.get_setting_numeric('service_fee_percentage',0),0);
  delay_pct := greatest(public.get_setting_numeric('delay_fee_percentage',0),0);
  if m.service_fee_paid_at is null then service_fee := round(s.amount * service_pct / 100,2); end if;
  grace_date := (date_trunc('month', s.due_date::timestamp) + interval '1 month - 1 day')::date;
  if current_date > grace_date then delay_fee := round(s.amount * delay_pct / 100,2); end if;
  total := greatest(coalesce(s.amount,0),0) + service_fee + delay_fee;
  if total <= 0 then return jsonb_build_object('success',false,'reason','INVALID_TOTAL_DUE'); end if;

  update public.contribution_schedules
  set service_fee_amount=service_fee, delay_fee_amount=delay_fee, total_due=total,
      delay_assessed_at=case when delay_fee>0 then coalesce(delay_assessed_at,now()) else delay_assessed_at end,
      status=case when current_date>grace_date and status::text='pending' then 'overdue' else status end,
      updated_at=now()
  where id=s.id;

  if coalesce(w.balance,0) < total then
    return jsonb_build_object('success',false,'reason','INSUFFICIENT_WALLET_BALANCE','required',total,'wallet_balance',coalesce(w.balance,0),'service_fee',service_fee,'delay_fee',delay_fee);
  end if;

  insert into public.payments(id,user_id,group_id,contribution_id,amount,currency,provider,provider_reference,status,metadata)
  values(payment_id,m.user_id,m.group_id,s.id,total,w.currency,'wallet','auto-debit-'||s.id::text,'succeeded',jsonb_build_object('source','scheduled_auto_debit','base_amount',s.amount,'service_fee',service_fee,'delay_fee',delay_fee));

  update public.wallets set balance=balance-total,updated_at=now() where id=w.id returning balance into new_balance;
  update public.contribution_schedules set outstanding_amount=0,total_due=total,status='paid',paid_at=now(),settlement_status='settled',settled_at=now(),updated_at=now() where id=s.id;

  if service_fee>0 and m.service_fee_paid_at is null then
    update public.group_members set service_fee_paid_at=now(),service_fee_amount=service_fee,updated_at=now() where id=m.id;
    insert into public.ledger_transactions(user_id,group_id,type,status,amount,currency,payment_id,description,metadata)
    values(m.user_id,m.group_id,'fee','posted',service_fee,w.currency,payment_id,'One-time service fee for group cycle',jsonb_build_object('fee_type','service_fee','period_number',s.period_number));
  end if;
  if delay_fee>0 then
    insert into public.ledger_transactions(user_id,group_id,type,status,amount,currency,payment_id,description,metadata)
    values(m.user_id,m.group_id,'penalty','posted',delay_fee,w.currency,payment_id,'Contribution delay fee',jsonb_build_object('fee_type','delay_fee','period_number',s.period_number));
  end if;
  insert into public.ledger_transactions(user_id,group_id,type,status,amount,currency,payment_id,description,metadata)
  values(m.user_id,m.group_id,'contribution','posted',s.amount,w.currency,payment_id,'Contribution payment from Alajo wallet (automatic debit)',jsonb_build_object('schedule_id',s.id,'period_number',s.period_number,'source','scheduled_auto_debit')) returning id into ledger_id;

  insert into public.notifications(user_id,type,title,body,metadata)
  values(m.user_id,'contribution_paid','Contribution paid automatically','Your wallet was automatically debited for your scheduled contribution.',jsonb_build_object('schedule_id',s.id,'payment_id',payment_id,'transaction_id',ledger_id,'amount',total,'service_fee',service_fee,'delay_fee',delay_fee));

  return jsonb_build_object('success',true,'schedule_id',s.id,'payment_id',payment_id,'wallet_balance',new_balance,'amount',s.amount,'service_fee',service_fee,'delay_fee',delay_fee,'total_paid',total,'status','paid');
end
$function$;

create or replace function public.process_due_contributions()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  result jsonb;
  v_paid integer:=0;
  v_skipped integer:=0;
  v_failed integer:=0;
begin
  for r in
    select cs.id
    from public.contribution_schedules cs
    join public.group_members gm on gm.id=cs.group_member_id
    where cs.status::text in ('pending','due','overdue','late','missed','grace')
      and cs.due_date <= current_date
      and gm.contribution_payment_method='auto_debit'
    order by cs.due_date,cs.id
    for update of cs skip locked limit 500
  loop
    begin
      result:=public.auto_debit_contribution(r.id);
      if coalesce((result->>'success')::boolean,false) then v_paid:=v_paid+1;
      elsif result->>'reason'='INSUFFICIENT_WALLET_BALANCE' then v_skipped:=v_skipped+1;
      else v_failed:=v_failed+1; end if;
    exception when others then
      v_failed:=v_failed+1;
    end;
  end loop;
  return jsonb_build_object('success',true,'auto_debited',v_paid,'insufficient_funds',v_skipped,'failed',v_failed);
end
$function$;

revoke execute on function public.pay_contribution_from_wallet(uuid,text) from anon, authenticated;
grant execute on function public.pay_contribution_from_wallet(uuid,text) to authenticated;
revoke execute on function public.process_due_contributions() from anon, authenticated;
grant execute on function public.process_due_contributions() to service_role;
