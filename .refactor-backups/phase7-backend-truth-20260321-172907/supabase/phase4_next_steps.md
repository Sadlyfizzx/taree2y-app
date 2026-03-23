# Taree2y Phase 4 - what this scaffold is for

This patch does two things:
1. fixes booking cutoff in the current frontend demo
2. creates Supabase backend files for the next migration

## What is already patched in the app
- user cannot book a trip that already departed
- user cannot book a trip that already finished
- user cannot book a trip that departs in less than 2 hours
- this rule is enforced in search results, seat selection, and checkout

## What is scaffolded but NOT yet wired into the app
- wallet tables in Supabase
- real booking table and seat table
- promo code tables and redemption tracking
- trip updates for backend-driven tracking
- support thread tables for future bot or agent workflow

## Recommended next wiring order
1. Replace localStorage wallet / transactions / trips / points with Supabase reads and writes.
2. Generate a stable `trip_key` from route + date + departure slot, and upsert it into `trip_inventory`.
3. On seat screen, fetch `trip_seats` and stop trusting generated availability alone.
4. Add seat hold logic before checkout.
5. On payment success, write booking + seats in one server-side transaction or RPC.
6. Move promo validation from client-only logic to Supabase or Edge Function validation.
7. Generate real QR payload from booking row.
8. Feed tracking screen from `trip_updates` instead of purely client-side lifecycle estimation.
9. Replace fake bot with support thread creation or FAQ retrieval.

## Important note
The current frontend still uses local demo state for wallet, trips, points, transactions, QR, and tracking.
That is intentional for safety: the schema is created here, but the full client migration should be done as a separate patch.
