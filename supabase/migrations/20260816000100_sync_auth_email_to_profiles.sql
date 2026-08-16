-- Keep the application profile synchronized with Supabase Auth at account creation.
-- This is defense-in-depth for registrations where email confirmation means the
-- browser has no authenticated session yet and cannot safely write to profiles.

create or replace function public.handle_new_deotech_finance_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_deotech_finance on auth.users;

create trigger on_auth_user_created_deotech_finance
after insert on auth.users
for each row
execute function public.handle_new_deotech_finance_user();

-- Repair existing profiles whose email is missing but whose Auth record has it.
update public.profiles p
set email = lower(u.email)
from auth.users u
where p.id = u.id
  and coalesce(trim(p.email), '') = ''
  and u.email is not null;
