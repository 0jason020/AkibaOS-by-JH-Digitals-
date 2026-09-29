create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text unique,
  email text,
  preferred_language text not null default 'English',
  kyc_status text not null default 'not_started' check (kyc_status in ('not_started', 'pending', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  currency text not null default 'RWF' check (currency = 'RWF'),
  balance_rwf bigint not null default 0 check (balance_rwf >= 0),
  status text not null default 'active' check (status in ('active', 'restricted', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  target_rwf bigint not null check (target_rwf > 0),
  target_date date,
  cadence text not null default 'weekly' check (cadence in ('weekly', 'fortnightly', 'monthly')),
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.savings_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  purpose text not null check (char_length(purpose) between 1 and 240),
  target_rwf bigint not null check (target_rwf > 0),
  visibility text not null default 'invite_only' check (visibility in ('invite_only', 'link')),
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.savings_group_members (
  group_id uuid not null references public.savings_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create or replace function public.is_group_member(group_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.savings_group_members m
    where m.group_id = group_uuid and m.user_id = auth.uid()
  );
$$;
revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;

create table public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_rwf bigint not null check (amount_rwf > 0),
  status text not null default 'pending' check (status in ('pending', 'posted', 'reversed')),
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('deposit', 'transfer', 'bill_payment', 'savings', 'loan_disbursement', 'loan_repayment', 'adjustment')),
  amount_rwf bigint not null check (amount_rwf <> 0),
  currency text not null default 'RWF' check (currency = 'RWF'),
  description text not null,
  reference text unique,
  status text not null default 'pending' check (status in ('pending', 'successful', 'failed', 'reversed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_code text not null,
  account_reference text not null,
  amount_rwf bigint not null check (amount_rwf > 0),
  status text not null default 'pending' check (status in ('pending', 'successful', 'failed', 'reversed')),
  provider_reference text,
  created_at timestamptz not null default now()
);

create table public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_rwf bigint not null check (requested_rwf > 0),
  term_months integer not null check (term_months between 1 and 36),
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'approved', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index savings_goals_user_created_idx on public.savings_goals(user_id, created_at desc);
create index transactions_user_created_idx on public.transactions(user_id, created_at desc);
create index bill_payments_user_created_idx on public.bill_payments(user_id, created_at desc);
create index loan_applications_user_created_idx on public.loan_applications(user_id, created_at desc);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger wallet_accounts_set_updated_at before update on public.wallet_accounts for each row execute function public.set_updated_at();
create trigger savings_goals_set_updated_at before update on public.savings_goals for each row execute function public.set_updated_at();
create trigger savings_groups_set_updated_at before update on public.savings_groups for each row execute function public.set_updated_at();
create trigger loan_applications_set_updated_at before update on public.loan_applications for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.phone,
    new.email
  ) on conflict (id) do nothing;

  insert into public.wallet_accounts (user_id)
  values (new.id) on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_groups enable row level security;
alter table public.savings_group_members enable row level security;
alter table public.savings_contributions enable row level security;
alter table public.transactions enable row level security;
alter table public.bill_payments enable row level security;
alter table public.loan_applications enable row level security;

create policy "profiles select own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles update own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "wallet select own" on public.wallet_accounts for select to authenticated using ((select auth.uid()) = user_id);

create policy "goals select own" on public.savings_goals for select to authenticated using ((select auth.uid()) = user_id);
create policy "goals create own" on public.savings_goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "goals update own" on public.savings_goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goals delete own" on public.savings_goals for delete to authenticated using ((select auth.uid()) = user_id);

create policy "groups select members" on public.savings_groups for select to authenticated using (owner_id = (select auth.uid()) or public.is_group_member(id));
create policy "groups create own" on public.savings_groups for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "groups update owner" on public.savings_groups for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "groups delete owner" on public.savings_groups for delete to authenticated using (owner_id = (select auth.uid()));

create policy "group members select group" on public.savings_group_members for select to authenticated using (user_id = (select auth.uid()) or public.is_group_member(group_id));
create policy "group owner adds members" on public.savings_group_members for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.savings_groups g where g.id = group_id and g.owner_id = (select auth.uid())
  )
);

create policy "contributions select own" on public.savings_contributions for select to authenticated using ((select auth.uid()) = user_id);
create policy "transactions select own" on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy "bill payments select own" on public.bill_payments for select to authenticated using ((select auth.uid()) = user_id);
create policy "loan applications select own" on public.loan_applications for select to authenticated using ((select auth.uid()) = user_id);
create policy "loan applications create own" on public.loan_applications for insert to authenticated with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kyc-documents', 'kyc-documents', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

create policy "kyc documents read own folder" on storage.objects for select to authenticated using (
  bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "kyc documents upload own folder" on storage.objects for insert to authenticated with check (
  bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "kyc documents delete own folder" on storage.objects for delete to authenticated using (
  bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = (select auth.uid())::text
);
