create table public.kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'verified', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_note text
);

create index kyc_submissions_user_date_idx on public.kyc_submissions(user_id, submitted_at desc);
alter table public.kyc_submissions enable row level security;
create policy "kyc submissions select own" on public.kyc_submissions for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.kyc_submissions from anon, authenticated;
grant select on public.kyc_submissions to authenticated;

drop function if exists public.submit_kyc_for_review();
create function public.submit_kyc_for_review()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  submission_id uuid;
  identity_count integer;
  residence_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select count(*) into identity_count
  from public.kyc_documents
  where user_id = current_user_id and document_type = 'identity';

  select count(*) into residence_count
  from public.kyc_documents
  where user_id = current_user_id and document_type = 'residence';

  if identity_count < 1 or residence_count < 1 then
    raise exception 'Upload identity and proof of residence documents before submitting';
  end if;

  insert into public.kyc_submissions (user_id, status)
  values (current_user_id, 'pending')
  returning id into submission_id;

  update public.profiles
  set kyc_status = 'pending'
  where id = current_user_id;

  return submission_id;
end;
$$;

revoke all on function public.submit_kyc_for_review() from public, anon;
grant execute on function public.submit_kyc_for_review() to authenticated;
