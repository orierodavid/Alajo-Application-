-- Secure permanent user deletion for ZeePay administrators.
-- Deleting from auth.users removes the authentication identity; linked profile data follows FK cascade rules.

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path='public,auth'
AS $function$
DECLARE
  actor uuid := auth.uid();
  actor_role text;
  target_email text;
  target_role text;
BEGIN
  SELECT public.get_my_admin_role()::text INTO actor_role;
  IF actor_role IS NULL THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_user_id = actor THEN RAISE EXCEPTION 'SELF_ACCOUNT_DELETE_NOT_ALLOWED'; END IF;

  SELECT p.email, ur.role::text
    INTO target_email, target_role
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = p_user_id;

  IF target_email IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF target_role = 'super_admin' THEN RAISE EXCEPTION 'SUPER_ADMIN_DELETE_RESTRICTED'; END IF;
  IF target_role IS NOT NULL AND actor_role <> 'super_admin' THEN RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED'; END IF;

  INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,previous_state,new_state,reason)
  VALUES(
    actor,
    'user_deleted',
    'user',
    p_user_id,
    jsonb_build_object('email', target_email, 'role', target_role),
    '{"deleted":true}'::jsonb,
    'Administrator permanently deleted user account'
  );

  DELETE FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'AUTH_USER_NOT_FOUND'; END IF;

  RETURN jsonb_build_object('user_id', p_user_id, 'deleted', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
