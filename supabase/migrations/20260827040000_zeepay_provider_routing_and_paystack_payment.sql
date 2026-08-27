-- ZeePay provider routing foundation: payments are provider-configured per market.
INSERT INTO public.provider_definitions (provider_key, provider_type, display_name, status, capabilities)
VALUES ('paystack_payment','PAYMENT','Paystack Payments','ACTIVE',jsonb_build_object('checkout',true,'card',true,'bank_transfer',true,'mobile_money',true))
ON CONFLICT (provider_key) DO UPDATE SET display_name=EXCLUDED.display_name,status='ACTIVE',capabilities=EXCLUDED.capabilities,updated_at=now();

INSERT INTO public.markets (country_code,name,default_currency,default_timezone,default_locale,status)
VALUES ('GH','Ghana','GHS','Africa/Accra','en-GH','CONFIGURING')
ON CONFLICT (country_code) DO NOTHING;

INSERT INTO public.market_provider_configs (market_id,provider_id,provider_type,environment,status,priority,public_config)
SELECT m.id,p.id,'PAYMENT','LIVE','ACTIVE',10,jsonb_build_object('currency','NGN')
FROM public.markets m CROSS JOIN public.provider_definitions p
WHERE m.country_code='NG' AND p.provider_key='paystack_payment'
ON CONFLICT (market_id,provider_id,environment) DO UPDATE SET status='ACTIVE',priority=10,updated_at=now();

-- Paystack KYC already validates the Nigerian bank account as part of the KYC flow.
-- Keep a single KYC provider selection rather than maintaining a duplicate Paystack bank-verification provider.
UPDATE public.market_provider_configs mpc
SET status='DISABLED',deactivated_at=now(),updated_at=now()
FROM public.provider_definitions pd, public.markets m
WHERE mpc.provider_id=pd.id AND mpc.market_id=m.id
  AND m.country_code='NG' AND pd.provider_key='paystack_bank_verification';

UPDATE public.provider_definitions
SET capabilities=jsonb_build_object('customer_validation',true,'bank_account_validation',true),updated_at=now()
WHERE provider_key='paystack_kyc';

UPDATE public.market_provider_configs mpc
SET priority=10,updated_at=now()
FROM public.provider_definitions pd, public.markets m
WHERE mpc.provider_id=pd.id AND mpc.market_id=m.id
  AND m.country_code='NG' AND pd.provider_key='paystack_kyc' AND mpc.provider_type='KYC' AND mpc.environment='LIVE';
