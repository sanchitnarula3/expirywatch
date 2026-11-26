-- ==============================================================================
-- ExpiryWatch: Complete Supabase Schema, RLS & Storage Script (Member 2)
-- Copy and paste this directly into Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Enable required extensions
create extension if not exists "uuid-ossp";

-- 2. Profiles Table (Linked with Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('admin', 'dept_head', 'staff')) default 'staff',
  department text not null check (department in ('HR', 'IT', 'Finance', 'Operations')) default 'Operations',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Documents Table
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('Insurance', 'Warranty', 'Licence', 'Contract', 'Certificate')),
  department text not null check (department in ('HR', 'IT', 'Finance', 'Operations')),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  expiry_date date not null,
  reminder_days_before integer not null default 7,
  last_notified_at timestamptz,
  created_at timestamptz not null default now()
);

-- 4. Renewal Logs Table (Audit trail)
create table if not exists public.renewal_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  renewed_by uuid not null references public.profiles(id) on delete cascade,
  previous_expiry_date date not null,
  new_expiry_date date not null,
  notes text not null default '',
  renewed_at timestamptz not null default now()
);

-- 5. Server-only reminder delivery ledger (one send per expiry cycle/milestone)
create table if not exists public.expiry_reminder_deliveries (
  document_id uuid not null references public.documents(id) on delete cascade,
  expiry_date date not null,
  milestone smallint not null check (milestone in (0, 1, 7)),
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  primary key (document_id, expiry_date, milestone)
);

alter table public.expiry_reminder_deliveries enable row level security;
revoke all on public.expiry_reminder_deliveries from anon, authenticated;
grant select, insert, update, delete on public.expiry_reminder_deliveries to service_role;

-- Indexes for fast querying
create index if not exists idx_documents_department on public.documents(department);
create index if not exists idx_documents_expiry_date on public.documents(expiry_date);
create index if not exists idx_documents_owner on public.documents(owner_id);
create index if not exists idx_renewal_logs_document on public.renewal_logs(document_id);

-- ==============================================================================
-- SECURITY DEFINER HELPERS (Avoid RLS recursive evaluation loops)
-- ==============================================================================

create or replace function public.get_current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.get_current_user_department()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select department from public.profiles where id = auth.uid();
$$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.renewal_logs enable row level security;

-- ------------------------------------------------------------------------------
-- PROFILES RLS
-- ------------------------------------------------------------------------------
drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.get_current_user_role() = 'admin'
  or (
    public.get_current_user_role() = 'dept_head'
    and department = public.get_current_user_department()
  )
);

drop policy if exists "profiles_update_policy" on public.profiles;
create policy "profiles_update_policy"
on public.profiles for update
to authenticated
using (
  id = auth.uid() or public.get_current_user_role() = 'admin'
)
with check (
  (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()))
  or public.get_current_user_role() = 'admin'
);

-- ------------------------------------------------------------------------------
-- DOCUMENTS RLS
-- ------------------------------------------------------------------------------
drop policy if exists "documents_select_policy" on public.documents;
create policy "documents_select_policy"
on public.documents for select
to authenticated
using (
  public.get_current_user_role() = 'admin'
  or department = public.get_current_user_department()
);

drop policy if exists "documents_insert_policy" on public.documents;
create policy "documents_insert_policy"
on public.documents for insert
to authenticated
with check (
  public.get_current_user_role() = 'admin'
  or (
    department = public.get_current_user_department()
    and owner_id = auth.uid()
  )
);

drop policy if exists "documents_update_policy" on public.documents;
create policy "documents_update_policy"
on public.documents for update
to authenticated
using (
  public.get_current_user_role() = 'admin'
  or department = public.get_current_user_department()
)
with check (
  public.get_current_user_role() = 'admin'
  or department = public.get_current_user_department()
);

drop policy if exists "documents_delete_policy" on public.documents;
create policy "documents_delete_policy"
on public.documents for delete
to authenticated
using (
  public.get_current_user_role() in ('admin', 'dept_head')
  and (
    public.get_current_user_role() = 'admin'
    or department = public.get_current_user_department()
  )
);

-- ------------------------------------------------------------------------------
-- RENEWAL LOGS RLS
-- ------------------------------------------------------------------------------
drop policy if exists "renewal_logs_select_policy" on public.renewal_logs;
create policy "renewal_logs_select_policy"
on public.renewal_logs for select
to authenticated
using (
  public.get_current_user_role() = 'admin'
  or exists (
    select 1 from public.documents d
    where d.id = renewal_logs.document_id
    and d.department = public.get_current_user_department()
  )
);

drop policy if exists "renewal_logs_insert_policy" on public.renewal_logs;
create policy "renewal_logs_insert_policy"
on public.renewal_logs for insert
to authenticated
with check (
  public.get_current_user_role() = 'admin'
  or (
    renewed_by = auth.uid()
    and exists (
      select 1 from public.documents d
      where d.id = renewal_logs.document_id
      and d.department = public.get_current_user_department()
    )
  )
);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ==============================================================================

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- SUPABASE CLOUD STORAGE BUCKET & STORAGE POLICIES
-- ==============================================================================

-- Create bucket 'documents' if it doesn't already exist
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

-- Storage policies
drop policy if exists "Authenticated users can upload documents" on storage.objects;
create policy "Authenticated users can upload documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (
    public.get_current_user_role() = 'admin'
    or lower((storage.foldername(name))[1]) = lower(public.get_current_user_department())
  )
);

drop policy if exists "Authenticated users can view department documents" on storage.objects;
create policy "Authenticated users can view department documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and (
    public.get_current_user_role() = 'admin'
    or (storage.foldername(name))[1] = public.get_current_user_department()
    or exists (
      select 1 from public.documents d
      where d.file_path = name
      and (d.department = public.get_current_user_department() or public.get_current_user_role() = 'admin')
    )
  )
);

drop policy if exists "Authorized users can delete documents" on storage.objects;
create policy "Authorized users can delete documents"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documents'
  and public.get_current_user_role() in ('admin', 'dept_head')
  and (
    public.get_current_user_role() = 'admin'
    or lower((storage.foldername(name))[1]) = lower(public.get_current_user_department())
  )
);

-- Narrow uploader-name lookup: staff can see names attached to accessible documents,
-- without receiving access to the organisation member directory.
create or replace function public.get_document_uploaders()
returns table (document_id uuid, uploader_name text)
language sql
security definer
set search_path = public
stable
as $$
  select d.id, p.full_name
  from public.documents d
  join public.profiles p on p.id = d.owner_id
  where public.get_current_user_role() = 'admin'
     or d.department = public.get_current_user_department();
$$;

revoke all on function public.get_document_uploaders() from public;
grant execute on function public.get_document_uploaders() to authenticated;


-- ==============================================================================
-- DEFAULT ADMIN SEED CREDENTIALS
-- Email: admin@expirywatch.com
-- Password: Admin@expirywatch123
-- ==============================================================================
create extension if not exists pgcrypto;

do $$
declare
  admin_uid uuid := 'a0000000-0000-0000-0000-000000000001';
begin
  if not exists (select 1 from auth.users where email = 'admin@expirywatch.com') then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      admin_uid,
      'authenticated',
      'authenticated',
      'admin@expirywatch.com',
      crypt('Admin@expirywatch123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"System Admin","role":"admin","department":"Operations"}',
      now(),
      now()
    );

    insert into public.profiles (id, full_name, email, role, department)
    values (
      admin_uid,
      'System Admin',
      'admin@expirywatch.com',
      'admin',
      'Operations'
    )
    on conflict (id) do update set
      role = 'admin',
      full_name = 'System Admin',
      department = 'Operations';
  end if;
end $$;
