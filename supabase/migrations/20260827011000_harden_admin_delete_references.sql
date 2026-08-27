-- Follow-up hardening for permanent account deletion with historical references.
ALTER TABLE public.groups ALTER COLUMN created_by DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public,auth' AS $function$
DECLARE actor uuid := auth.uid(); actor_role text; target_role text; target_email text;
BEGIN
  SELECT public.get_my_admin_role()::text INTO actor_role;
  IF actor_role IS NULL THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'USER_ID_REQUIRED'; END IF;
  IF p_user_id = actor THEN RAISE EXCEPTION 'SELF_ACCOUNT_DELETE_NOT_ALLOWED'; END IF;
  SELECT p.email, ur.role::text INTO target_email,target_role FROM public.profiles p LEFT JOIN public.user_roles ur ON ur.user_id=p.id WHERE p.id=p_user_id;
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
  UPDATE public.contribution_schedules SET settled_payment_transaction_id=NULL WHERE settled_payment_transaction_id IN (SELECT id FROM public.payment_transactions WHERE user_id=p_user_id);
  DELETE FROM public.payment_transactions WHERE user_id=p_user_id;
  UPDATE public.contribution_schedules SET settled_ledger_entry_id=NULL WHERE settled_ledger_entry_id IN (SELECT id FROM public.financial_ledger_entries WHERE user_id=p_user_id);
  DELETE FROM public.financial_ledger_entries WHERE user_id=p_user_id;
  DELETE FROM public.balance_reconciliation_snapshots WHERE user_id=p_user_id;

  INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,previous_state,new_state,reason) VALUES(actor,'user_deleted','user',p_user_id,jsonb_build_object('email',target_email),'{}'::jsonb,'Administrator permanently deleted user account');
  DELETE FROM public.profiles WHERE id=p_user_id;
  DELETE FROM auth.users WHERE id=p_user_id;
  RETURN jsonb_build_object('user_id',p_user_id,'deleted',true);
END;
$function$;
