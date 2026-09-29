create table public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('identity', 'selfie', 'residence')),
  storage_path text not null unique,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.kyc_documents enable row level security;
create policy "kyc metadata select own" on public.kyc_documents for select to authenticated using ((select auth.uid()) = user_id);
create policy "kyc metadata create own" on public.kyc_documents for insert to authenticated with check ((select auth.uid()) = user_id);

create or replace function public.add_group_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.savings_group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (group_id, user_id) do nothing;
  return new;
end;
$$;

create trigger savings_group_add_owner
after insert on public.savings_groups
for each row execute function public.add_group_owner();

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, full_name, phone, email) on public.profiles to authenticated;
grant update (full_name, email, preferred_language) on public.profiles to authenticated;

revoke all on public.wallet_accounts from anon, authenticated;
grant select on public.wallet_accounts to authenticated;

revoke all on public.savings_goals from anon, authenticated;
grant select, delete on public.savings_goals to authenticated;
grant insert (user_id, name, target_rwf, target_date, cadence) on public.savings_goals to authenticated;
grant update (name, target_rwf, target_date, cadence) on public.savings_goals to authenticated;

revoke all on public.savings_groups from anon, authenticated;
grant select, delete on public.savings_groups to authenticated;
grant insert (owner_id, name, purpose, target_rwf, visibility) on public.savings_groups to authenticated;
grant update (name, purpose, target_rwf, visibility) on public.savings_groups to authenticated;

revoke all on public.savings_group_members from anon, authenticated;
grant select, insert on public.savings_group_members to authenticated;

revoke all on public.savings_contributions from anon, authenticated;
grant select on public.savings_contributions to authenticated;

revoke all on public.transactions from anon, authenticated;
grant select on public.transactions to authenticated;

revoke all on public.bill_payments from anon, authenticated;
grant select on public.bill_payments to authenticated;

revoke all on public.loan_applications from anon, authenticated;
grant select on public.loan_applications to authenticated;
grant insert (user_id, requested_rwf, term_months) on public.loan_applications to authenticated;

revoke all on public.kyc_documents from anon, authenticated;
grant select on public.kyc_documents to authenticated;
grant insert (user_id, document_type, storage_path) on public.kyc_documents to authenticated;
