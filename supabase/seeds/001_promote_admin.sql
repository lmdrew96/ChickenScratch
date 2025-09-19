-- Replace the email below with the account that should become the first admin.
update public.profiles
set role = 'admin'
where email = 'admin@udel.edu';
