-- Taree2y Phase 5 sync additions
-- Apply this AFTER phase4_backend_schema.sql

alter table public.profiles
  add column if not exists loyalty_points integer not null default 0;

alter table public.profiles
  add column if not exists subscription_plan text not null default 'none';

alter table public.app_wallet_transactions
  add column if not exists client_id text unique;

alter table public.bookings
  add column if not exists booking_snapshot jsonb not null default '{}'::jsonb;
