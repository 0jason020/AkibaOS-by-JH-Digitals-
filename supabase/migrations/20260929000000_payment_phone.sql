grant update (phone) on public.profiles to authenticated;

alter table public.profiles
	add constraint profiles_phone_e164_check
	check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');