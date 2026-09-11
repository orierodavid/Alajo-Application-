-- ZeePay policy default: 2% delay fee per day after the contribution due date.
-- This is a simple daily fee based on the scheduled contribution amount,
-- not a compounding fee. Super Admin may change the configurable rate later.
INSERT INTO public.system_settings(key,numeric_value,updated_at)
VALUES ('delay_fee_percentage',2,now())
ON CONFLICT (key) DO UPDATE
SET numeric_value=2,updated_at=now();
