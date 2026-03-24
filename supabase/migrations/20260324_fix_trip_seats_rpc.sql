create or replace function public.get_trip_seats(
  p_trip_instance_id uuid
)
returns table (
  id uuid,
  seat_number text,
  seat_index integer,
  status text,
  hold_expires_at timestamptz,
  held_by_user_id uuid
)
language sql
security definer
set search_path = public
as $$
  select
    ts.id,
    ts.seat_number,
    ts.seat_index,
    ts.status,
    ts.hold_expires_at,
    ts.held_by_user_id
  from public.trip_seats ts
  where ts.trip_instance_id = p_trip_instance_id
  order by ts.seat_index asc;
$$;

revoke all on function public.get_trip_seats(uuid) from public;
grant execute on function public.get_trip_seats(uuid) to authenticated;
