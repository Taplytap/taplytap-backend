create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  city text not null,
  avatar_url text,
  bio text,
  verified boolean not null default false,
  plan_type text not null default 'free' check (plan_type in ('free', 'premium')),
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  city text not null,
  estimated_value integer not null check (estimated_value >= 0),
  condition text not null check (condition in ('nuevo', 'usado bueno', 'usado regular')),
  accepts_cash_difference boolean not null default false,
  status text not null default 'disponible' check (status in ('disponible', 'pausado', 'intercambiado')),
  created_at timestamptz not null default now()
);

create table public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0
);

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  swiper_user_id uuid not null references public.users(id) on delete cascade,
  swiper_item_id uuid not null references public.items(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  direction text not null check (direction in ('like', 'pass')),
  created_at timestamptz not null default now(),
  unique (swiper_user_id, swiper_item_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.users(id) on delete cascade,
  user_b_id uuid not null references public.users(id) on delete cascade,
  item_a_id uuid not null references public.items(id) on delete cascade,
  item_b_id uuid not null references public.items(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.users(id) on delete cascade,
  reported_user_id uuid references public.users(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  reason text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references public.users(id) on delete cascade,
  blocked_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_user_id, blocked_user_id)
);

create index items_city_status_idx on public.items (city, status, created_at desc);
create index swipes_swiper_idx on public.swipes (swiper_user_id, created_at desc);
create index matches_users_idx on public.matches (user_a_id, user_b_id, created_at desc);
create index messages_match_idx on public.messages (match_id, created_at asc);
