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
  boost_enabled boolean not null default false,
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
  add column if not exists boost_enabled boolean not null default false,
  add column if not exists place_id text,
  add column if not exists owner_user_id uuid references auth.users(id),
  add column if not exists claimed_at timestamptz,
  add column if not exists contact_name text,
  add column if not exists whatsapp text,
  add column if not exists shopify_order_number text;

create index if not exists qr_codes_owner_user_id_idx on public.qr_codes (owner_user_id);
create index if not exists qr_codes_owner_email_idx on public.qr_codes (owner_email);
create index if not exists qr_codes_boost_enabled_idx on public.qr_codes (boost_enabled);

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

create table if not exists public.boost_feedback (
  id uuid primary key default gen_random_uuid(),
  qr_code_id uuid references public.qr_codes(id) on delete set null,
  code text not null,
  rating int not null check (rating between 1 and 3),
  message text not null,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now(),
  constraint boost_feedback_code_format check (code ~ '^[a-z0-9_-]{4,64}$')
);

create index if not exists boost_feedback_qr_code_id_idx on public.boost_feedback (qr_code_id);
create index if not exists boost_feedback_code_idx on public.boost_feedback (code);
create index if not exists boost_feedback_created_at_idx on public.boost_feedback (created_at desc);

create table if not exists public.boost_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'inactive',
  source text,
  email text,
  shopify_customer_id text,
  shopify_order_id text,
  shopify_subscription_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boost_subscriptions_status_check check (status in ('inactive', 'active', 'canceled', 'past_due')),
  constraint boost_subscriptions_user_id_key unique (user_id)
);

alter table public.boost_subscriptions
  add column if not exists source text,
  add column if not exists email text,
  add column if not exists shopify_customer_id text,
  add column if not exists shopify_order_id text,
  add column if not exists shopify_subscription_id text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end timestamptz;

create index if not exists boost_subscriptions_user_id_idx on public.boost_subscriptions (user_id);
create index if not exists boost_subscriptions_status_idx on public.boost_subscriptions (status);
create index if not exists boost_subscriptions_email_idx on public.boost_subscriptions (email);
create index if not exists boost_subscriptions_stripe_subscription_id_idx on public.boost_subscriptions (stripe_subscription_id);

create table if not exists public.instagram_plates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status public.qr_status not null default 'inactive',
  public_url text,
  destination_url text,
  business_name text,
  instagram_handle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instagram_plates_code_format check (code ~ '^[a-z0-9_-]{4,64}$'),
  constraint instagram_plates_destination_https check (
    destination_url is null or destination_url ~ '^https://'
  ),
  constraint instagram_plates_active_has_destination check (
    status <> 'active' or destination_url is not null
  )
);

create index if not exists instagram_plates_status_idx on public.instagram_plates (status);
create index if not exists instagram_plates_created_at_idx on public.instagram_plates (created_at);

create table if not exists public.shopify_webhook_events (
  id text primary key,
  topic text not null,
  shop_domain text,
  processed_at timestamptz not null default now()
);

create table if not exists public.boost_subscription_pending (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'active',
  shopify_customer_id text,
  shopify_order_id text,
  payload jsonb,
  created_at timestamptz not null default now(),
  constraint boost_subscription_pending_status_check check (status in ('inactive', 'active', 'canceled', 'past_due'))
);

create index if not exists boost_subscription_pending_email_idx on public.boost_subscription_pending (email);
create index if not exists boost_subscription_pending_shopify_order_id_idx on public.boost_subscription_pending (shopify_order_id);

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

drop trigger if exists set_boost_subscriptions_updated_at on public.boost_subscriptions;
create trigger set_boost_subscriptions_updated_at
before update on public.boost_subscriptions
for each row
execute function public.set_updated_at();

drop trigger if exists set_instagram_plates_updated_at on public.instagram_plates;
create trigger set_instagram_plates_updated_at
before update on public.instagram_plates
for each row
execute function public.set_updated_at();

alter table public.qr_codes enable row level security;
alter table public.scan_events enable row level security;
alter table public.boost_feedback enable row level security;
alter table public.boost_subscriptions enable row level security;
alter table public.instagram_plates enable row level security;
alter table public.shopify_webhook_events enable row level security;
alter table public.boost_subscription_pending enable row level security;

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

drop policy if exists "Deny public boost feedback writes" on public.boost_feedback;
create policy "Deny public boost feedback writes"
on public.boost_feedback
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "Deny public boost subscription access" on public.boost_subscriptions;
create policy "Deny public boost subscription access"
on public.boost_subscriptions
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "Deny public instagram plates access" on public.instagram_plates;
create policy "Deny public instagram plates access"
on public.instagram_plates
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "Deny public shopify webhook events access" on public.shopify_webhook_events;
create policy "Deny public shopify webhook events access"
on public.shopify_webhook_events
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "Deny public boost subscription pending access" on public.boost_subscription_pending;
create policy "Deny public boost subscription pending access"
on public.boost_subscription_pending
for all
to anon, authenticated
using (false)
with check (false);
