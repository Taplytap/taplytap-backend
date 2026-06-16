create extension if not exists pgcrypto;

do $$
begin
  create type public.qr_status as enum ('inactive', 'active', 'blocked');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status public.qr_status not null default 'inactive',
  public_url text,
  destination_url text,
  place_id text,
  business_name text,
  contact_name text,
  whatsapp text,
  owner_email text,
  owner_user_id uuid references auth.users(id),
  shopify_order_number text,
  activated_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qr_codes_code_format check (code ~ '^[a-z0-9_-]{4,64}$'),
  constraint qr_codes_destination_https check (
    destination_url is null or destination_url ~ '^https://'
  ),
  constraint qr_codes_active_has_destination check (
    status <> 'active' or destination_url is not null
  )
);

create index if not exists qr_codes_status_idx on public.qr_codes (status);
create index if not exists qr_codes_owner_email_idx on public.qr_codes (owner_email);
create index if not exists qr_codes_owner_user_id_idx on public.qr_codes (owner_user_id);

alter table public.qr_codes
  add column if not exists public_url text,
  add column if not exists place_id text,
  add column if not exists owner_user_id uuid references auth.users(id),
  add column if not exists claimed_at timestamptz,
  add column if not exists contact_name text,
  add column if not exists whatsapp text,
  add column if not exists shopify_order_number text;

create index if not exists qr_codes_owner_user_id_idx on public.qr_codes (owner_user_id);
create index if not exists qr_codes_owner_email_idx on public.qr_codes (owner_email);

create table if not exists public.scan_events (
  id uuid primary key default gen_random_uuid(),
  qr_code_id uuid references public.qr_codes(id) on delete set null,
  code text not null,
  status_at_scan text not null check (status_at_scan in ('inactive', 'active', 'blocked', 'not_found')),
  destination_url text,
  user_agent text,
  referrer text,
  ip_hash text,
  created_at timestamptz not null default now(),
  constraint scan_events_code_format check (code ~ '^[a-z0-9_-]{4,64}$')
);

create index if not exists scan_events_qr_code_id_idx on public.scan_events (qr_code_id);
create index if not exists scan_events_code_idx on public.scan_events (code);
create index if not exists scan_events_created_at_idx on public.scan_events (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_qr_codes_updated_at on public.qr_codes;
create trigger set_qr_codes_updated_at
before update on public.qr_codes
for each row
execute function public.set_updated_at();

alter table public.qr_codes enable row level security;
alter table public.scan_events enable row level security;

drop policy if exists "Admins can read QR codes" on public.qr_codes;
drop policy if exists "Admins can read scan events" on public.scan_events;

drop policy if exists "Deny public QR writes" on public.qr_codes;
create policy "Deny public QR writes"
on public.qr_codes
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "Deny public scan writes" on public.scan_events;
create policy "Deny public scan writes"
on public.scan_events
for all
to anon, authenticated
using (false)
with check (false);
