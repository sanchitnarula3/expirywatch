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
