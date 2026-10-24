-- TaplyTap Operations audit log.
-- This migration creates a new isolated table. It does not alter plate tables or existing data.

create table if not exists public.support_plate_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text not null,
  plate_type text not null,
  plate_id uuid not null,
  code text not null,
  action text not null default 'update',
  previous_data jsonb not null,
  new_data jsonb not null,
  created_at timestamptz not null default now(),
  constraint support_plate_audit_logs_plate_type_check
    check (plate_type in ('google', 'instagram', 'facebook', 'profile')),
  constraint support_plate_audit_logs_action_check check (action in ('update')),
  constraint support_plate_audit_logs_code_format check (code ~ '^[a-z0-9_-]{4,64}$')
);

create index if not exists support_plate_audit_logs_actor_user_id_idx
  on public.support_plate_audit_logs (actor_user_id);
create index if not exists support_plate_audit_logs_plate_idx
  on public.support_plate_audit_logs (plate_type, plate_id);
create index if not exists support_plate_audit_logs_code_idx
  on public.support_plate_audit_logs (code);
create index if not exists support_plate_audit_logs_created_at_idx
  on public.support_plate_audit_logs (created_at desc);

alter table public.support_plate_audit_logs enable row level security;

drop policy if exists "Deny public support plate audit logs access"
  on public.support_plate_audit_logs;

create policy "Deny public support plate audit logs access"
on public.support_plate_audit_logs
for all
to anon, authenticated
using (false)
with check (false);

select
  to_regclass('public.support_plate_audit_logs') as audit_table,
  (select count(*) from public.support_plate_audit_logs) as audit_rows;
