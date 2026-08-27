CREATE OR REPLACE FUNCTION public.admin_payment_provider_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path='public'
AS $$
DECLARE r text;
BEGIN
  SELECT public.get_my_admin_role()::text INTO r;
  IF r IS NULL THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  RETURN jsonb_build_object(
    'providers', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',pd.id,'provider_key',pd.provider_key,'provider_type',pd.provider_type,'display_name',pd.display_name,'status',pd.status,'credential_configured',EXISTS(SELECT 1 FROM vault.secrets vs WHERE vs.name='provider_credential_' || pd.provider_key),'markets',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',mpc.id,'market_id',mpc.market_id,'provider_type',mpc.provider_type,'environment',mpc.environment,'status',mpc.status,'priority',mpc.priority) ORDER BY mpc.environment,mpc.priority) FROM public.market_provider_configs mpc WHERE mpc.provider_id=pd.id),'[]'::jsonb)) ORDER BY pd.display_name) FROM public.provider_definitions pd WHERE pd.status <> 'DISABLED'),'[]'::jsonb),
    'markets', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.country_name) FROM (SELECT m.id,m.country_code,m.name AS country_name,m.default_currency AS currency_code,m.status,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',mpc.id,'provider_id',mpc.provider_id,'provider_key',pd.provider_key,'provider_name',pd.display_name,'provider_type',mpc.provider_type,'environment',mpc.environment,'status',mpc.status,'is_active',(mpc.status='ACTIVE'),'priority',mpc.priority,'credential_configured',EXISTS(SELECT 1 FROM vault.secrets vs WHERE vs.name='provider_credential_' || pd.provider_key)) ORDER BY mpc.provider_type,mpc.priority) FROM public.market_provider_configs mpc JOIN public.provider_definitions pd ON pd.id=mpc.provider_id WHERE mpc.market_id=m.id),'[]'::jsonb) providers FROM public.markets m) x),'[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_market_provider(p_config_id uuid,p_active boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE r text;
BEGIN
  SELECT public.get_my_admin_role()::text INTO r;
  IF r IS NULL THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  UPDATE public.market_provider_configs
  SET status=CASE WHEN p_active THEN 'ACTIVE' ELSE 'DISABLED' END,
      activated_at=CASE WHEN p_active THEN COALESCE(activated_at,now()) ELSE activated_at END,
      deactivated_at=CASE WHEN p_active THEN NULL ELSE now() END,
      updated_at=now()
  WHERE id=p_config_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONFIG_NOT_FOUND'; END IF;
  RETURN jsonb_build_object('id',p_config_id,'is_active',p_active,'status',CASE WHEN p_active THEN 'ACTIVE' ELSE 'DISABLED' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_provider_credential(p_provider_id uuid,p_secret text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE actor uuid:=auth.uid(); actor_role text; provider_key text; secret_name text; secret_id uuid; cfg_count integer;
BEGIN
  SELECT public.get_my_admin_role()::text INTO actor_role;
  IF actor_role <> 'super_admin' THEN RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED'; END IF;
  IF p_secret IS NULL OR length(trim(p_secret)) < 10 THEN RAISE EXCEPTION 'INVALID_PROVIDER_CREDENTIAL'; END IF;
  SELECT pd.provider_key INTO provider_key FROM public.provider_definitions pd WHERE pd.id=p_provider_id AND pd.status <> 'DISABLED';
  IF provider_key IS NULL THEN RAISE EXCEPTION 'PROVIDER_NOT_FOUND'; END IF;
  secret_name:='provider_credential_' || provider_key;
  SELECT id INTO secret_id FROM vault.secrets WHERE name=secret_name LIMIT 1;
  IF secret_id IS NULL THEN secret_id:=vault.create_secret(trim(p_secret),secret_name,'Protected provider credential for ' || provider_key);
  ELSE PERFORM vault.update_secret(secret_id,trim(p_secret),secret_name,'Protected provider credential for ' || provider_key,NULL); END IF;
  UPDATE public.market_provider_configs SET secret_reference=secret_name,updated_at=now() WHERE provider_id=p_provider_id;
  GET DIAGNOSTICS cfg_count=ROW_COUNT;
  INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,previous_state,new_state,reason) VALUES(actor,'provider_credential_rotated','provider_definition',p_provider_id,'{}'::jsonb,jsonb_build_object('provider_key',provider_key,'secret_name',secret_name,'configurations_updated',cfg_count),'Super Admin provider credential rotation');
  RETURN jsonb_build_object('provider_id',p_provider_id,'provider_key',provider_key,'configured',true,'configurations_updated',cfg_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.server_get_provider_secret(p_provider_key text)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path='public' AS $$
  SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name='provider_credential_' || p_provider_key LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.admin_payment_provider_config() FROM anon,public;
REVOKE ALL ON FUNCTION public.admin_set_market_provider(uuid,boolean) FROM anon,public;
REVOKE ALL ON FUNCTION public.admin_upsert_provider_credential(uuid,text) FROM anon,public;
REVOKE ALL ON FUNCTION public.server_get_provider_secret(text) FROM anon,public,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_payment_provider_config() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_market_provider(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_provider_credential(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.server_get_provider_secret(text) TO service_role;
