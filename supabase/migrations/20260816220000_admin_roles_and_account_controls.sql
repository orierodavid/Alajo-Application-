-- Deotech Finance admin roles and user account controls.
-- Existing primary administrator is promoted to super_admin in production separately.

CREATE OR REPLACE FUNCTION public.admin_set_user_status(p_user_id uuid, p_status public.user_status)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $function$
DECLARE actor uuid:=auth.uid(); actor_role text; old_status public.user_status; target_email text;
BEGIN
  SELECT public.get_my_admin_role()::text INTO actor_role;
  IF actor_role IS NULL THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_user_id=actor THEN RAISE EXCEPTION 'SELF_ACCOUNT_CHANGE_NOT_ALLOWED'; END IF;
  SELECT status,email INTO old_status,target_email FROM public.profiles WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF old_status=p_status THEN RETURN jsonb_build_object('user_id',p_user_id,'status',p_status::text,'changed',false); END IF;
  UPDATE public.profiles SET status=p_status,updated_at=now() WHERE id=p_user_id;
  INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,previous_state,new_state,reason) VALUES(actor,'account_status_changed','user',p_user_id,jsonb_build_object('status',old_status::text,'email',target_email),jsonb_build_object('status',p_status::text,'email',target_email),'Admin account status change');
  INSERT INTO public.notifications(user_id,type,title,body,metadata) VALUES(p_user_id,'account_status',CASE WHEN p_status::text='suspended' THEN 'Account disabled' ELSE 'Account enabled' END,CASE WHEN p_status::text='suspended' THEN 'Your Deotech Finance account has been disabled by an administrator. Contact support if you believe this was done in error.' ELSE 'Your Deotech Finance account has been enabled. You can sign in and continue using your account.' END,jsonb_build_object('status',p_status::text));
  RETURN jsonb_build_object('user_id',p_user_id,'status',p_status::text,'changed',true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id uuid, p_role public.admin_role)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $function$
DECLARE actor uuid:=auth.uid(); actor_role text; old_role text; target_email text;
BEGIN
  SELECT public.get_my_admin_role()::text INTO actor_role;
  IF actor_role<>'super_admin' THEN RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED'; END IF;
  IF p_user_id=actor THEN RAISE EXCEPTION 'SELF_ROLE_CHANGE_NOT_ALLOWED'; END IF;
  IF p_role='super_admin'::public.admin_role THEN RAISE EXCEPTION 'SUPER_ADMIN_ASSIGNMENT_RESTRICTED'; END IF;
  SELECT email INTO target_email FROM public.profiles WHERE id=p_user_id;
  IF target_email IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  SELECT role::text INTO old_role FROM public.user_roles WHERE user_id=p_user_id;
  INSERT INTO public.user_roles(user_id,role) VALUES(p_user_id,p_role) ON CONFLICT(user_id) DO UPDATE SET role=EXCLUDED.role;
  INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,previous_state,new_state,reason) VALUES(actor,'admin_role_changed','user_role',p_user_id,jsonb_build_object('role',old_role,'email',target_email),jsonb_build_object('role',p_role::text,'email',target_email),'Super Admin role assignment');
  RETURN jsonb_build_object('user_id',p_user_id,'role',p_role::text,'changed',old_role IS DISTINCT FROM p_role::text);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_remove_user_role(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $function$
DECLARE actor uuid:=auth.uid(); actor_role text; old_role text; target_email text;
BEGIN
  SELECT public.get_my_admin_role()::text INTO actor_role;
  IF actor_role<>'super_admin' THEN RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED'; END IF;
  IF p_user_id=actor THEN RAISE EXCEPTION 'SELF_ROLE_CHANGE_NOT_ALLOWED'; END IF;
  SELECT email INTO target_email FROM public.profiles WHERE id=p_user_id;
  SELECT role::text INTO old_role FROM public.user_roles WHERE user_id=p_user_id;
  IF old_role IS NULL THEN RETURN jsonb_build_object('user_id',p_user_id,'removed',false); END IF;
  IF old_role='super_admin' THEN RAISE EXCEPTION 'SUPER_ADMIN_REMOVAL_RESTRICTED'; END IF;
  DELETE FROM public.user_roles WHERE user_id=p_user_id;
  INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,previous_state,new_state,reason) VALUES(actor,'admin_role_removed','user_role',p_user_id,jsonb_build_object('role',old_role,'email',target_email),'{}'::jsonb,'Super Admin removed administrator access');
  RETURN jsonb_build_object('user_id',p_user_id,'removed',true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_find_user_by_email(p_email text)
RETURNS TABLE(id uuid,full_name text,email text,status text,role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $function$
DECLARE actor_role text;
BEGIN
  SELECT public.get_my_admin_role()::text INTO actor_role;
  IF actor_role IS NULL THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  RETURN QUERY SELECT p.id,p.full_name,p.email,p.status::text,ur.role::text FROM public.profiles p LEFT JOIN public.user_roles ur ON ur.user_id=p.id WHERE lower(p.email)=lower(trim(p_email)) LIMIT 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_set_user_status(uuid,public.user_status) FROM anon,public;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid,public.admin_role) FROM anon,public;
REVOKE ALL ON FUNCTION public.admin_remove_user_role(uuid) FROM anon,public;
REVOKE ALL ON FUNCTION public.admin_find_user_by_email(text) FROM anon,public;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid,public.user_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid,public.admin_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_find_user_by_email(text) TO authenticated;
