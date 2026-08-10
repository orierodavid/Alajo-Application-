-- Harden payout settlement.
-- User-facing clients may read their own payouts but only admins may create/update/delete payout rows.
-- Settlement is atomic, locked, idempotent, and requires a fully funded payout.

create or replace function public.settle_payout(p_payout_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_payout public.payouts%rowtype;
  v_admin boolean;
  v_ref text;
  v_tx_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select exists (select 1 from public.user_roles ur where ur.user_id = v_user and ur.role = 'admin') into v_admin;
  if not v_admin then raise exception 'ADMIN_REQUIRED'; end if;

  select * into v_payout from public.payouts where id = p_payout_id for update;
  if not found then raise exception 'PAYOUT_NOT_FOUND'; end if;

  if v_payout.status = 'paid' then
    return jsonb_build_object('success', true, 'status', 'paid', 'payout_id', v_payout.id, 'already_settled', true);
  end if;

  if v_payout.status not in ('funded','processing') then raise exception 'PAYOUT_NOT_READY'; end if;
  if v_payout.funded_amount < v_payout.expected_amount then raise exception 'PAYOUT_SHORTFALL'; end if;

  v_ref := coalesce(v_payout.provider_reference, 'ALJ-PAYOUT-' || v_payout.id::text);

  if exists (select 1 from public.ledger_transactions where payout_id = v_payout.id and type = 'payout') then
    update public.payouts set status='paid', paid_at=coalesce(paid_at,now()), provider_reference=v_ref, updated_at=now() where id=v_payout.id;
    update public.group_members set payout_received_at=coalesce(payout_received_at,now()), updated_at=now() where id=v_payout.group_member_id;
    return jsonb_build_object('success', true, 'status', 'paid', 'payout_id', v_payout.id, 'already_settled', true);
  end if;

  insert into public.ledger_transactions (user_id,group_id,type,status,amount,currency,payout_id,description,metadata)
  values ((select user_id from public.group_members where id=v_payout.group_member_id),v_payout.group_id,'payout','posted',v_payout.expected_amount,'NGN',v_payout.id,'Alajo payout',jsonb_build_object('payout_id',v_payout.id,'provider_reference',v_ref))
  returning id into v_tx_id;

  update public.payouts set status='paid', paid_at=now(), provider_reference=v_ref, updated_at=now() where id=v_payout.id;
  update public.group_members set payout_received_at=coalesce(payout_received_at,now()), updated_at=now() where id=v_payout.group_member_id;

  return jsonb_build_object('success',true,'status','paid','payout_id',v_payout.id,'transaction_id',v_tx_id,'provider_reference',v_ref);
end;
$$;

revoke all on function public.settle_payout(uuid) from public;
grant execute on function public.settle_payout(uuid) to authenticated;

alter table public.payouts enable row level security;

create policy payouts_insert_admin on public.payouts for insert to authenticated
with check (exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role='admin'));
create policy payouts_update_admin on public.payouts for update to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role='admin'))
with check (exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role='admin'));
create policy payouts_delete_admin on public.payouts for delete to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role='admin'));
