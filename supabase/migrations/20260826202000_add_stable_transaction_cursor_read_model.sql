create index if not exists idx_ledger_user_payment
  on public.ledger_transactions (user_id, payment_id)
  where payment_id is not null;

create or replace function public.get_my_transactions(
  p_limit integer default 25,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_cursor_source text default null
)
returns table (
  id uuid,
  type text,
  amount numeric,
  currency text,
  status text,
  provider text,
  reference text,
  date timestamptz,
  group_id uuid,
  contribution_id uuid,
  description text,
  source text
)
language sql
stable
set search_path = public
as $$
with merged as (
  select
    l.id,
    l.type::text as type,
    l.amount,
    coalesce(l.currency, 'NGN') as currency,
    l.status::text as status,
    null::text as provider,
    null::text as reference,
    l.created_at as date,
    l.group_id,
    null::uuid as contribution_id,
    coalesce(l.description, l.type::text) as description,
    'ledger'::text as source,
    0::integer as source_rank
  from public.ledger_transactions l
  where l.user_id = auth.uid()

  union all

  select
    p.id,
    case when p.contribution_id is not null then 'contribution' else 'wallet_funding' end as type,
    p.amount,
    coalesce(p.currency, 'NGN') as currency,
    p.status::text as status,
    p.provider,
    p.provider_reference as reference,
    p.created_at as date,
    p.group_id,
    p.contribution_id,
    case when p.contribution_id is not null then 'Contribution payment' else 'Wallet funding' end as description,
    'payment'::text as source,
    1::integer as source_rank
  from public.payments p
  where p.user_id = auth.uid()
    and not exists (
      select 1
      from public.ledger_transactions l
      where l.user_id = auth.uid()
        and l.payment_id = p.id
    )
),
filtered as (
  select *
  from merged
  where p_cursor_created_at is null
     or date < p_cursor_created_at
     or (
       date = p_cursor_created_at
       and source_rank > case p_cursor_source when 'payment' then 1 else 0 end
     )
     or (
       date = p_cursor_created_at
       and source_rank = case p_cursor_source when 'payment' then 1 else 0 end
       and p_cursor_id is not null
       and id < p_cursor_id
     )
)
select
  id, type, amount, currency, status, provider, reference, date,
  group_id, contribution_id, description, source
from filtered
order by date desc, source_rank asc, id desc
limit greatest(1, least(coalesce(p_limit, 25), 100)) + 1;
$$;

grant execute on function public.get_my_transactions(integer, timestamptz, uuid, text) to authenticated;
