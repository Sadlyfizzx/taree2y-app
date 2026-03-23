-- Taree2y Phase 4 backend scaffold
-- Run this in Supabase SQL Editor AFTER reviewing table names and policies.

create extension if not exists pgcrypto;

create table if not exists public.app_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(12,2) not null default 0,
  currency text not null default 'EGP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('credit','debit','refund','redeem','promo_adjustment')),
  amount numeric(12,2) not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_inventory (
  trip_key text primary key,
  from_city text not null,
  to_city text not null,
  trip_date date not null,
  departure_time time not null,
  arrival_time time not null,
  company text not null,
  seat_class text not null,
  price integer not null,
  capacity integer not null default 40,
  route_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_seats (
  id uuid primary key default gen_random_uuid(),
  trip_key text not null references public.trip_inventory(trip_key) on delete cascade,
  seat_number text not null,
  status text not null default 'available' check (status in ('available','held','booked')),
  held_by uuid references public.profiles(id) on delete set null,
  hold_expires_at timestamptz,
  booking_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_key, seat_number)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  pnr text unique not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_key text not null references public.trip_inventory(trip_key) on delete restrict,
  status text not null check (status in ('upcoming','refund_pending','cancelled','past')),
  total_amount numeric(12,2) not null,
  promo_code text,
  luggage boolean not null default false,
  ride_to_station boolean not null default false,
  access_support boolean not null default false,
  earned_points integer not null default 0,
  points_awarded boolean not null default false,
  qr_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trip_seats
  drop constraint if exists trip_seats_booking_id_fkey;

alter table public.trip_seats
  add constraint trip_seats_booking_id_fkey
  foreign key (booking_id) references public.bookings(id) on delete set null;

create table if not exists public.booking_passengers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  seat_number text not null,
  passenger_name text,
  passenger_phone text,
  created_at timestamptz not null default now(),
  unique (booking_id, seat_number)
);

create table if not exists public.promo_codes (
  code text primary key,
  discount_type text not null check (discount_type in ('flat','percent')),
  discount_value numeric(12,2) not null,
  max_discount numeric(12,2),
  min_subtotal numeric(12,2) not null default 0,
  first_booking_only boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  per_user_limit integer not null default 1,
  is_active boolean not null default true,
  route_from text,
  route_to text,
  eligible_tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.promo_codes(code) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  discount_amount numeric(12,2) not null,
  redeemed_at timestamptz not null default now()
);

create table if not exists public.trip_updates (
  id uuid primary key default gen_random_uuid(),
  trip_key text not null references public.trip_inventory(trip_key) on delete cascade,
  update_type text not null check (update_type in ('scheduled','boarding','en_route','rest_stop','final_approach','arrived','delay')),
  message text not null,
  progress_pct numeric(5,2),
  eta_time time,
  created_at timestamptz not null default now()
);

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null default 'دعم التطبيق',
  status text not null default 'open' check (status in ('open','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  sender_role text not null check (sender_role in ('user','agent','bot')),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.app_wallets enable row level security;
alter table public.app_wallet_transactions enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_passengers enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

alter table public.trip_inventory enable row level security;
alter table public.trip_seats enable row level security;
alter table public.promo_codes enable row level security;
alter table public.trip_updates enable row level security;

drop policy if exists "wallet own select" on public.app_wallets;
create policy "wallet own select" on public.app_wallets
  for select using (auth.uid() = user_id);
drop policy if exists "wallet own upsert" on public.app_wallets;
create policy "wallet own upsert" on public.app_wallets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "wallet tx own select" on public.app_wallet_transactions;
create policy "wallet tx own select" on public.app_wallet_transactions
  for select using (auth.uid() = user_id);
drop policy if exists "wallet tx own insert" on public.app_wallet_transactions;
create policy "wallet tx own insert" on public.app_wallet_transactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "bookings own select" on public.bookings;
create policy "bookings own select" on public.bookings
  for select using (auth.uid() = user_id);
drop policy if exists "bookings own insert" on public.bookings;
create policy "bookings own insert" on public.bookings
  for insert with check (auth.uid() = user_id);
drop policy if exists "bookings own update" on public.bookings;
create policy "bookings own update" on public.bookings
  for update using (auth.uid() = user_id);

drop policy if exists "booking passengers own select" on public.booking_passengers;
create policy "booking passengers own select" on public.booking_passengers
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = auth.uid()
    )
  );
drop policy if exists "booking passengers own insert" on public.booking_passengers;
create policy "booking passengers own insert" on public.booking_passengers
  for insert with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "promo redemptions own select" on public.promo_redemptions;
create policy "promo redemptions own select" on public.promo_redemptions
  for select using (auth.uid() = user_id);
drop policy if exists "promo redemptions own insert" on public.promo_redemptions;
create policy "promo redemptions own insert" on public.promo_redemptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "support threads own" on public.support_threads;
create policy "support threads own" on public.support_threads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "support messages own" on public.support_messages;
create policy "support messages own" on public.support_messages
  for select using (
    exists (
      select 1 from public.support_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );
drop policy if exists "support messages own insert" on public.support_messages;
create policy "support messages own insert" on public.support_messages
  for insert with check (
    exists (
      select 1 from public.support_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "trip inventory public read" on public.trip_inventory;
create policy "trip inventory public read" on public.trip_inventory
  for select using (true);
drop policy if exists "trip seats public read" on public.trip_seats;
create policy "trip seats public read" on public.trip_seats
  for select using (true);
drop policy if exists "promo codes public read" on public.promo_codes;
create policy "promo codes public read" on public.promo_codes
  for select using (true);
drop policy if exists "trip updates public read" on public.trip_updates;
create policy "trip updates public read" on public.trip_updates
  for select using (true);
