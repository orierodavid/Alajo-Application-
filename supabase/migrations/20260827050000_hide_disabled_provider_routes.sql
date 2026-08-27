CREATE OR REPLACE FUNCTION public.admin_payment_provider_config() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE r text;
BEGIN
  SELECT public.get_my_admin_role()::text INTO r;
  IF r IS NULL THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  RETURN jsonb_build_object(
    'providers', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',pd.id,'provider_key',pd.provider_key,'provider_type',pd.provider_type,'display_name',pd.display_name,'status',pd.status,'credential_configured',EXISTS(SELECT 1 FROM vault.secrets vs WHERE vs.name='provider_credential_' || pd.provider_key),'markets',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',mpc.id,'market_id',mpc.market_id,'provider_type',mpc.provider_type,'environment',mpc.environment,'status',mpc.status,'priority',mpc.priority) ORDER BY mpc.environment,mpc.priority) FROM public.market_provider_configs mpc WHERE mpc.provider_id=pd.id),'[]'::jsonb)) ORDER BY pd.display_name) FROM public.provider_definitions pd WHERE pd.status <> 'DISABLED'),'[]'::jsonb),
    'markets', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.country_name) FROM (SELECT m.id,m.country_code,m.name AS country_name,m.default_currency AS currency_code,m.status,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',mpc.id,'provider_id',mpc.provider_id,'provider_key',pd.provider_key,'provider_name',pd.display_name,'provider_type',mpc.provider_type,'environment',mpc.environment,'status',mpc.status,'is_active',(mpc.status='ACTIVE'),'priority',mpc.priority,'credential_configured',EXISTS(SELECT 1 FROM vault.secrets vs WHERE vs.name='provider_credential_' || pd.provider_key)) ORDER BY mpc.provider_type,mpc.priority) FROM public.market_provider_configs mpc JOIN public.provider_definitions pd ON pd.id=mpc.provider_id WHERE mpc.market_id=m.id AND pd.status <> 'DISABLED'),'[]'::jsonb) providers FROM public.markets m) x),'[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_payment_provider_config() FROM anon,public;
GRANT EXECUTE ON FUNCTION public.admin_payment_provider_config() TO authenticated;
