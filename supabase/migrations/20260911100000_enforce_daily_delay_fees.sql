-- ZeePay contribution policy: a contribution unpaid after its required due date
-- accrues the configured delay fee for every day it remains unpaid.
-- Default policy is 2% of the scheduled contribution amount per day.
-- The fee is simple (non-compounding): base contribution x daily rate x days late.

INSERT INTO public.system_settings(key,numeric_value,updated_at)
VALUES ('delay_fee_percentage',2,now())
ON CONFLICT (key) DO UPDATE
SET numeric_value = CASE
  WHEN public.system_settings.numeric_value IS NULL OR public.system_settings.numeric_value = 0
    THEN 2
  ELSE public.system_settings.numeric_value
END,
updated_at = now();

CREATE OR REPLACE FUNCTION public.apply_overdue_delay_fees()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fee_percentage numeric := GREATEST(COALESCE(public.get_setting_numeric('delay_fee_percentage',2),2),0);
  v_updated integer := 0;
BEGIN
  UPDATE public.contribution_schedules cs
  SET
    status = CASE
      WHEN cs.status::text IN ('pending','due','grace','late','missed') THEN 'overdue'::public.contribution_status
      ELSE cs.status
    END,
    delay_fee_amount = ROUND(
      GREATEST(COALESCE(cs.amount,0),0)
      * v_fee_percentage / 100
      * GREATEST(CURRENT_DATE - cs.due_date,0),
      2
    ),
    total_due = GREATEST(COALESCE(cs.amount,0),0)
      + COALESCE(cs.service_fee_amount,0)
      + ROUND(
          GREATEST(COALESCE(cs.amount,0),0)
          * v_fee_percentage / 100
          * GREATEST(CURRENT_DATE - cs.due_date,0),
          2
        ),
    outstanding_amount = GREATEST(
      COALESCE(cs.outstanding_amount,0),
      GREATEST(COALESCE(cs.amount,0),0)
      + COALESCE(cs.service_fee_amount,0)
      + ROUND(
          GREATEST(COALESCE(cs.amount,0),0)
          * v_fee_percentage / 100
          * GREATEST(CURRENT_DATE - cs.due_date,0),
          2
        )
    ),
    delay_assessed_at = CASE
      WHEN CURRENT_DATE > cs.due_date THEN COALESCE(cs.delay_assessed_at,now())
      ELSE cs.delay_assessed_at
    END,
    updated_at = now()
  FROM public.group_members gm
  WHERE gm.id = cs.group_member_id
    AND gm.status::text IN ('active','pending')
    AND cs.status::text IN ('pending','due','overdue','late','missed','grace')
    AND COALESCE(cs.outstanding_amount,0) > 0
    AND cs.due_date < CURRENT_DATE;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN jsonb_build_object(
    'success',true,
    'delay_fee_percentage',v_fee_percentage,
    'updated',v_updated
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.pay_contribution_from_wallet(p_schedule_id uuid, p_idempotency_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  s public.contribution_schedules%rowtype;
  m public.group_members%rowtype;
  w public.wallets%rowtype;
  v_base numeric;
  v_service numeric := 0;
  v_delay numeric := 0;
  v_total numeric;
  v_now timestamptz := now();
  v_new_balance numeric;
  v_payment_id uuid := gen_random_uuid();
  v_ledger_id uuid;
  v_delay_pct numeric := GREATEST(COALESCE(public.get_setting_numeric('delay_fee_percentage',2),2),0);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 OR length(p_idempotency_key) > 128 THEN RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY'; END IF;

  SELECT * INTO s FROM public.contribution_schedules WHERE id = p_schedule_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONTRIBUTION_NOT_FOUND'; END IF;

  SELECT * INTO m FROM public.group_members WHERE id = s.group_member_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONTRIBUTION_NOT_FOUND'; END IF;

  IF s.status::text = 'paid' OR s.settlement_status::text = 'settled' THEN
    RETURN jsonb_build_object('success',true,'already_paid',true,'schedule_id',p_schedule_id);
  END IF;
  IF s.status::text NOT IN ('pending','due','overdue','late','missed','grace') THEN RAISE EXCEPTION 'CONTRIBUTION_NOT_PAYABLE'; END IF;

  IF date_trunc('month', s.due_date::timestamp) <> date_trunc('month', current_date::timestamp) THEN
    RAISE EXCEPTION 'CURRENT_MONTH_ONLY';
  END IF;

  SELECT * INTO w FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WALLET_NOT_FOUND'; END IF;

  v_base := GREATEST(COALESCE(s.amount,0),0);
  IF v_base <= 0 THEN RAISE EXCEPTION 'INVALID_BASE_AMOUNT'; END IF;

  IF m.service_fee_paid_at IS NULL THEN
    v_service := ROUND(v_base * GREATEST(public.get_setting_numeric('service_fee_percentage',0),0) / 100,2);
  END IF;

  v_delay := ROUND(
    v_base * v_delay_pct / 100 * GREATEST(CURRENT_DATE - s.due_date,0),
    2
  );
  v_total := v_base + v_service + v_delay;

  UPDATE public.contribution_schedules
  SET service_fee_amount=v_service,
      delay_fee_amount=v_delay,
      total_due=v_total,
      outstanding_amount=GREATEST(COALESCE(outstanding_amount,0),v_total),
      delay_assessed_at=CASE WHEN v_delay>0 THEN COALESCE(delay_assessed_at,v_now) ELSE delay_assessed_at END,
      status=CASE WHEN CURRENT_DATE>s.due_date AND status::text IN ('pending','due','grace','late','missed') THEN 'overdue' ELSE status END,
      updated_at=v_now
  WHERE id=s.id;

  IF EXISTS(SELECT 1 FROM public.financial_ledger_entries WHERE user_id=v_uid AND idempotency_key=p_idempotency_key) THEN
    RETURN jsonb_build_object('success',true,'already_processed',true,'schedule_id',p_schedule_id);
  END IF;

  IF COALESCE(w.balance,0) < v_total THEN
    RETURN jsonb_build_object(
      'success',false,
      'code','INSUFFICIENT_FUNDS',
      'required',v_total,
      'balance',COALESCE(w.balance,0),
      'delay_fee',v_delay,
      'days_late',GREATEST(CURRENT_DATE - s.due_date,0)
    );
  END IF;

  UPDATE public.wallets SET balance=balance-v_total, updated_at=v_now WHERE id=w.id RETURNING balance INTO v_new_balance;

  INSERT INTO public.payments(id,user_id,group_id,contribution_id,amount,currency,provider,provider_reference,status,metadata)
  VALUES(v_payment_id,v_uid,m.group_id,s.id,v_total,w.currency,'wallet','wallet-contribution-'||s.id::text,'succeeded',jsonb_build_object(
    'source','manual_wallet','base_amount',v_base,'service_fee',v_service,'delay_fee',v_delay,
    'days_late',GREATEST(CURRENT_DATE - s.due_date,0),'delay_fee_rate_daily',v_delay_pct
  ));

  INSERT INTO public.financial_ledger_entries(user_id,market_id,contribution_schedule_id,entry_type,direction,amount_minor,currency,idempotency_key,description,metadata)
  VALUES(v_uid,null,s.id,'CONTRIBUTION_PAYMENT','DEBIT',round(v_total*100)::bigint,w.currency,p_idempotency_key,'Contribution paid from wallet',jsonb_build_object(
    'group_member_id',m.id,'payment_method','manual_wallet','period_number',s.period_number,
    'base_amount',v_base,'service_fee',v_service,'delay_fee',v_delay,
    'days_late',GREATEST(CURRENT_DATE - s.due_date,0),'delay_fee_rate_daily',v_delay_pct
  ))
  RETURNING id INTO v_ledger_id;

  IF v_service > 0 AND m.service_fee_paid_at IS NULL THEN
    UPDATE public.group_members SET service_fee_paid_at=v_now, service_fee_amount=v_service, updated_at=v_now WHERE id=m.id;
  END IF;

  UPDATE public.contribution_schedules
  SET status='paid',paid_at=v_now,outstanding_amount=0,settlement_status='settled',settled_at=v_now,updated_at=v_now
  WHERE id=s.id;

  INSERT INTO public.notifications(user_id,type,title,body,metadata)
  VALUES(v_uid,'contribution_paid','Contribution payment successful','Your contribution for period '||s.period_number||' has been paid successfully.',jsonb_build_object(
    'schedule_id',s.id,'payment_id',v_payment_id,'transaction_id',v_ledger_id,'amount',v_total,
    'service_fee',v_service,'delay_fee',v_delay,'days_late',GREATEST(CURRENT_DATE - s.due_date,0)
  ));

  RETURN jsonb_build_object('success',true,'schedule_id',s.id,'payment_id',v_payment_id,'wallet_balance',v_new_balance,
    'amount',v_base,'service_fee',v_service,'delay_fee',v_delay,'days_late',GREATEST(CURRENT_DATE - s.due_date,0),
    'total_paid',v_total,'status','paid');
END
$function$;

CREATE OR REPLACE FUNCTION public.auto_debit_contribution(p_schedule_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
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
BEGIN
  IF NOT public.get_setting_boolean('auto_debit_enabled', true) THEN RETURN jsonb_build_object('success',false,'reason','AUTO_DEBIT_DISABLED'); END IF;

  SELECT * INTO s FROM public.contribution_schedules WHERE id=p_schedule_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'reason','CONTRIBUTION_NOT_FOUND'); END IF;
  IF s.status::text NOT IN ('pending','due','overdue','late','missed','grace') THEN RETURN jsonb_build_object('success',false,'reason','NOT_PAYABLE','status',s.status); END IF;
  IF s.due_date > current_date THEN RETURN jsonb_build_object('success',false,'reason','NOT_DUE'); END IF;

  SELECT * INTO m FROM public.group_members WHERE id=s.group_member_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'reason','MEMBERSHIP_NOT_FOUND'); END IF;
  IF m.contribution_payment_method <> 'auto_debit' THEN RETURN jsonb_build_object('success',false,'reason','AUTO_DEBIT_NOT_SELECTED'); END IF;

  SELECT * INTO w FROM public.wallets WHERE user_id=m.user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'reason','WALLET_NOT_FOUND'); END IF;

  service_pct := GREATEST(public.get_setting_numeric('service_fee_percentage',0),0);
  delay_pct := GREATEST(COALESCE(public.get_setting_numeric('delay_fee_percentage',2),2),0);
  IF m.service_fee_paid_at IS NULL THEN service_fee := ROUND(s.amount * service_pct / 100,2); END IF;
  delay_fee := ROUND(s.amount * delay_pct / 100 * GREATEST(CURRENT_DATE - s.due_date,0),2);
  total := GREATEST(COALESCE(s.amount,0),0) + service_fee + delay_fee;
  IF total <= 0 THEN RETURN jsonb_build_object('success',false,'reason','INVALID_TOTAL_DUE'); END IF;

  UPDATE public.contribution_schedules
  SET service_fee_amount=service_fee,
      delay_fee_amount=delay_fee,
      total_due=total,
      outstanding_amount=GREATEST(COALESCE(outstanding_amount,0),total),
      delay_assessed_at=CASE WHEN delay_fee>0 THEN COALESCE(delay_assessed_at,now()) ELSE delay_assessed_at END,
      status=CASE WHEN CURRENT_DATE>s.due_date AND status::text IN ('pending','due','grace','late','missed') THEN 'overdue' ELSE status END,
      updated_at=now()
  WHERE id=s.id;

  IF COALESCE(w.balance,0) < total THEN
    RETURN jsonb_build_object('success',false,'reason','INSUFFICIENT_WALLET_BALANCE','required',total,
      'wallet_balance',COALESCE(w.balance,0),'service_fee',service_fee,'delay_fee',delay_fee,
      'days_late',GREATEST(CURRENT_DATE - s.due_date,0));
  END IF;

  INSERT INTO public.payments(id,user_id,group_id,contribution_id,amount,currency,provider,provider_reference,status,metadata)
  VALUES(payment_id,m.user_id,m.group_id,s.id,total,w.currency,'wallet','auto-debit-'||s.id::text,'succeeded',jsonb_build_object(
    'source','scheduled_auto_debit','base_amount',s.amount,'service_fee',service_fee,'delay_fee',delay_fee,
    'days_late',GREATEST(CURRENT_DATE - s.due_date,0),'delay_fee_rate_daily',delay_pct
  ));

  UPDATE public.wallets SET balance=balance-total,updated_at=now() WHERE id=w.id RETURNING balance INTO new_balance;
  UPDATE public.contribution_schedules SET outstanding_amount=0,total_due=total,status='paid',paid_at=now(),settlement_status='settled',settled_at=now(),updated_at=now() WHERE id=s.id;

  IF service_fee>0 AND m.service_fee_paid_at IS NULL THEN
    UPDATE public.group_members SET service_fee_paid_at=now(),service_fee_amount=service_fee,updated_at=now() WHERE id=m.id;
    INSERT INTO public.ledger_transactions(user_id,group_id,type,status,amount,currency,payment_id,description,metadata)
    VALUES(m.user_id,m.group_id,'fee','posted',service_fee,w.currency,payment_id,'One-time service fee for group cycle',jsonb_build_object('fee_type','service_fee','period_number',s.period_number));
  END IF;
  IF delay_fee>0 THEN
    INSERT INTO public.ledger_transactions(user_id,group_id,type,status,amount,currency,payment_id,description,metadata)
    VALUES(m.user_id,m.group_id,'penalty','posted',delay_fee,w.currency,payment_id,'Contribution delay fee',jsonb_build_object(
      'fee_type','delay_fee','period_number',s.period_number,'days_late',GREATEST(CURRENT_DATE - s.due_date,0),'daily_rate',delay_pct
    ));
  END IF;
  INSERT INTO public.ledger_transactions(user_id,group_id,type,status,amount,currency,payment_id,description,metadata)
  VALUES(m.user_id,m.group_id,'contribution','posted',s.amount,w.currency,payment_id,'Contribution payment from ZeePay wallet (automatic debit)',jsonb_build_object(
    'schedule_id',s.id,'period_number',s.period_number,'source','scheduled_auto_debit'
  )) RETURNING id INTO ledger_id;

  INSERT INTO public.notifications(user_id,type,title,body,metadata)
  VALUES(m.user_id,'contribution_paid','Contribution paid automatically','Your wallet was automatically debited for your scheduled contribution.',jsonb_build_object(
    'schedule_id',s.id,'payment_id',payment_id,'transaction_id',ledger_id,'amount',total,
    'service_fee',service_fee,'delay_fee',delay_fee,'days_late',GREATEST(CURRENT_DATE - s.due_date,0)
  ));

  RETURN jsonb_build_object('success',true,'schedule_id',s.id,'payment_id',payment_id,'wallet_balance',new_balance,
    'amount',s.amount,'service_fee',service_fee,'delay_fee',delay_fee,'days_late',GREATEST(CURRENT_DATE - s.due_date,0),
    'total_paid',total,'status','paid');
END
$function$;

REVOKE EXECUTE ON FUNCTION public.apply_overdue_delay_fees() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_overdue_delay_fees() TO service_role;
REVOKE EXECUTE ON FUNCTION public.pay_contribution_from_wallet(uuid,text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pay_contribution_from_wallet(uuid,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_debit_contribution(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_debit_contribution(uuid) TO service_role;
