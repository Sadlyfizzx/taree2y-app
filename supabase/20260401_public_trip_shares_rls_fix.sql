begin;

-- public_trip_shares is not read directly by the app.
-- The current frontend uses RPCs only:
--   - create_public_trip_share
--   - get_public_trip_share
-- So the safest fix is:
--   1) enable RLS on the table
--   2) revoke direct table access from anon/authenticated/public
--   3) keep RPCs as the only access boundary

alter table public.public_trip_shares enable row level security;

revoke all privileges on table public.public_trip_shares from public;
revoke all privileges on table public.public_trip_shares from anon;
revoke all privileges on table public.public_trip_shares from authenticated;

comment on table public.public_trip_shares is
  'Public trip-share tokens table. Direct PostgREST access is blocked; access must go through vetted RPCs.';

comment on column public.public_trip_shares.token is
  'Sensitive public tracking token. Do not expose through direct table policies; resolve only through RPC.';

commit;
