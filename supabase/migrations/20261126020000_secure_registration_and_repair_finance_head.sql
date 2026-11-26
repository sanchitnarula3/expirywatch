-- Public registration always creates staff. Higher roles must be assigned by an admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, department)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    'staff',
    coalesce(nullif(trim(new.raw_user_meta_data->>'department'), ''), 'Operations')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;

-- Repair the already-authorized Finance department-head account whose auth user
-- existed without a corresponding application profile.
insert into public.profiles (id, full_name, email, role, department)
select
  users.id,
  coalesce(nullif(trim(users.raw_user_meta_data->>'full_name'), ''), 'Finance Department Head'),
  coalesce(users.email, ''),
  'dept_head',
  'Finance'
from auth.users as users
where users.id = 'b9b0da3f-af0f-4a29-bd05-8258d26c8a92'
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = 'dept_head',
  department = 'Finance';
