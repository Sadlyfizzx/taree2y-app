# Stability patch notes

This patch focuses on shipping correctness before feature work or UI redesign.

## What it changes

- normalizes Supabase RPC logging and error classification
- fixes cancellation transport/error reporting in the frontend
- removes dangerous client-side fallback success for real cloud cancellations
- prevents `useCloudAppState` from writing cloud bookings back into `bookings` as duplicate snapshot rows
- preserves local wallet and transaction persistence for non-RPC flows
- bootstraps missing profile rows instead of bouncing signed-in users back to login
- adds a migration that recreates `cancel_booking_atomic(uuid)` with valid time arithmetic

## Why cancellation was failing

Two backend problems were present at the same time:

1. the frontend was hitting `/rpc/cancel_booking_atomic`, but the deployed function contract was drifting from what the frontend expected, which is why transport-level 404s were appearing
2. the deployed cancellation SQL had invalid interval math (`interval / interval`), which breaks refund-window calculation

A third frontend problem made this harder to diagnose:

3. the RPC helper flattened transport details into a generic `{ ok: false, message }` shape, so the UI lost the distinction between missing RPC and SQL logic failure

## Why the cloud snapshot writer was risky

`useCloudAppState` was re-saving the in-memory `myTrips` array back into `bookings`, even for rows that already originated from the backend. That can create duplicate writes or unique-key collisions after successful RPC bookings/cancellations.
