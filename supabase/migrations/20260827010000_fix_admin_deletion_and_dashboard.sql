-- Fix admin user deletion while preserving financial history and restore dashboard summary.

ALTER TABLE public.group_members ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.payments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.disputes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.group_slots DROP CONSTRAINT IF EXISTS group_slots_reserved_by_fkey;
ALTER TABLE public.group_slots ADD CONSTRAINT group_slots_reserved_by_fkey FOREIGN KEY (reserved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.group_members DROP CONSTRAINT IF EXISTS group_members_user_id_fkey;
ALTER TABLE public.group_members ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.ledger_transactions DROP CONSTRAINT IF EXISTS ledger_transactions_user_id_fkey;
ALTER TABLE public.ledger_transactions ADD CONSTRAINT ledger_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_user_id_fkey;
ALTER TABLE public.disputes ADD CONSTRAINT disputes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_created_by_fkey;
ALTER TABLE public.groups ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_user_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.kyc_records DROP CONSTRAINT IF EXISTS kyc_records_reviewed_by_fkey;
ALTER TABLE public.kyc_records ADD CONSTRAINT kyc_records_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public,auth' AS $function$
DECLARE actor uuid := auth.uid(); actor_role text; target_role text; target_email text;
BEGIN
  SELECT public.get_my_admin_role()::text INTO actor_role;
  IF actor_role IS NULL THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'USER_ID_REQUIRED'; END IF;
  IF p_user_id = actor THEN RAISE EXCEPTION 'SELF_ACCOUNT_DELETE_NOT_ALLOWED'; END IF;
  SELECT p.email, ur.role::text INTO target_email, target_role FROM public.profiles p LEFT JOIN public.user_roles ur ON ur.user_id=p.id WHERE p.id=p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF target_role='super_admin' THEN RAISE EXCEPTION 'SUPER_ADMIN_DELETE_NOT_ALLOWED'; END IF;

  DELETE FROM public.notifications WHERE user_id=p_user_id;
  DELETE FROM public.waiting_list WHERE user_id=p_user_id;
  DELETE FROM public.kyc_records WHERE user_id=p_user_id;
  DELETE FROM public.wallets WHERE user_id=p_user_id;
  DELETE FROM public.user_roles WHERE user_id=p_user_id;
  DELETE FROM public.user_virtual_accounts WHERE user_id=p_user_id;
  DELETE FROM public.user_bank_accounts WHERE user_id=p_user_id;
  DELETE FROM public.user_kyc_profiles WHERE user_id=p_user_id;
  DELETE FROM public.provider_customers WHERE user_id=p_user_id;
  DELETE FROM public.waiting_list_entries WHERE user_id=p_user_id;
  DELETE FROM public.payout_reservations WHERE user_id=p_user_id;
  DELETE FROM public.payout_requests WHERE user_id=p_user_id;
  DELETE FROM public.payment_transactions WHERE user_id=p_user_id;
  DELETE FROM public.financial_ledger_entries WHERE user_id=p_user_id;
  DELETE FROM public.balance_reconciliation_snapshots WHERE user_id=p_user_id;

  INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,previous_state,new_state,reason)
  VALUES(actor,'user_deleted','user',p_user_id,jsonb_build_object('email',target_email),'{}'::jsonb,'Administrator permanently deleted user account');
  DELETE FROM public.profiles WHERE id=p_user_id;
  DELETE FROM auth.users WHERE id=p_user_id;
  RETURN jsonb_build_object('user_id',p_user_id,'deleted',true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $function$
DECLARE actor_role text;
BEGIN
  SELECT public.get_my_admin_role()::text INTO actor_role;
  IF actor_role IS NULL THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  RETURN jsonb_build_object(
    'users',(SELECT count(*) FROM public.profiles),
    'kyc_pending',(SELECT count(*) FROM public.user_kyc_profiles WHERE status IN ('PENDING','REVIEW')) + (SELECT count(*) FROM public.kyc_records WHERE status IN ('pending','under_review')),
    'groups_active',(SELECT count(*) FROM public.groups WHERE status='active'),
    'contributions_due',(SELECT count(*) FROM public.contribution_schedules WHERE status IN ('pending','processing','overdue')),
    'contributions_paid',(SELECT count(*) FROM public.contribution_schedules WHERE status='paid'),
    'payouts_upcoming',(SELECT count(*) FROM public.payouts WHERE status IN ('scheduled','eligibility_review','approved','processing')),
    'payouts_paid',(SELECT count(*) FROM public.payouts WHERE status='paid'),
    'failed_payments',(SELECT count(*) FROM public.payments WHERE status IN ('failed','reversed')) + (SELECT count(*) FROM public.payment_transactions WHERE status='FAILED')
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_dashboard_summary() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_summary() TO authenticated;
