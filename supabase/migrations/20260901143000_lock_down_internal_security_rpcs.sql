-- Internal coordination RPCs must never be callable by browser clients.
-- They accept arbitrary identifiers and are used only by trusted server code.
REVOKE ALL ON FUNCTION public.claim_idempotency_key(text,text,uuid,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_idempotency_key(text,text,uuid,text,jsonb,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.try_acquire_work_lock(text,uuid,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_work_lock(text,uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_idempotency_key(text,text,uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_idempotency_key(text,text,uuid,text,jsonb,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.try_acquire_work_lock(text,uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_work_lock(text,uuid) TO service_role;
