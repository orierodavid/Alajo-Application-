-- ZeePay admin manual coverage for post-payout defaults.
-- This is an internal reserve/coverage transaction, NOT a member payment.

CREATE OR REPLACE FUNCTION public.admin_cover_default_case(p_default_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path='public'
AS $function$
DECLARE
  dc public.default_cases%rowtype;
  actor_role text;
  remaining bigint;
  existing_cover bigint;
  cover_amount bigint;
  target_payout public.payouts%rowtype;
BEGIN
  actor_role := public.get_my_admin_role();
  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  SELECT * INTO dc
  FROM public.default_cases
  WHERE id = p_default_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DEFAULT_CASE_NOT_FOUND';
  END IF;

  IF NOT dc.payout_received THEN
    RAISE EXCEPTION 'MANUAL_COVER_ONLY_ALLOWED_AFTER_PAYOUT';
  END IF;

  IF dc.status::text IN ('resolved','cancelled') THEN
    RAISE EXCEPTION 'DEFAULT_CASE_ALREADY_CLOSED';
  END IF;

  remaining := GREATEST(COALESCE(dc.outstanding_amount,0),0);
  existing_cover := GREATEST(COALESCE(dc.deotech_covered_amount,0),0);
  cover_amount := GREATEST(remaining - existing_cover,0);

  IF cover_amount <= 0 THEN
    RAISE EXCEPTION 'DEFAULT_ALREADY_COVERED';
  END IF;

  SELECT p.* INTO target_payout
  FROM public.payouts p
  JOIN public.group_members gm ON gm.id = p.group_member_id
  WHERE p.group_id = dc.group_id
    AND gm.payout_received_at IS NOT NULL
    AND p.status::text IN ('scheduled','held','processing')
  ORDER BY p.scheduled_date, p.period_number, p.id
  LIMIT 1
  FOR UPDATE;

  INSERT INTO public.recovery_transactions(default_case_id,amount,source,provider_reference)
  VALUES (
    dc.id,
    cover_amount,
    'deotech_cover',
    'ADMIN-COVER-' || dc.id::text || '-' || to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')
  );

  INSERT INTO public.ledger_transactions(
    user_id,group_id,type,status,amount,currency,payout_id,description,metadata
  ) VALUES (
    NULL,
    dc.group_id,
    'reserve_cover',
    'posted',
    cover_amount,
    'NGN',
    target_payout.id,
    'ZeePay internal coverage for post-payout default',
    jsonb_build_object(
      'default_case_id', dc.id,
      'admin_role', actor_role,
      'coverage_source', 'admin_manual_default_coverage',
      'member_payment', false,
      'member_debt_preserved', true
    )
  );

  UPDATE public.default_cases
  SET deotech_covered_amount = COALESCE(deotech_covered_amount,0) + cover_amount,
      updated_at = now()
  WHERE id = dc.id;

  IF target_payout.id IS NOT NULL THEN
    UPDATE public.payouts
    SET funded_amount = LEAST(expected_amount, COALESCE(funded_amount,0) + cover_amount),
        shortfall_amount = GREATEST(expected_amount - LEAST(expected_amount, COALESCE(funded_amount,0) + cover_amount),0),
        status = CASE
          WHEN COALESCE(funded_amount,0) + cover_amount >= expected_amount THEN 'processing'::public.payout_status
          ELSE status
        END,
        updated_at = now()
    WHERE id = target_payout.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'default_case_id', dc.id,
    'covered_amount', cover_amount,
    'remaining_member_debt', remaining,
    'admin_role', actor_role,
    'payout_id', target_payout.id
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_cover_default_case(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_cover_default_case(uuid) TO authenticated;
