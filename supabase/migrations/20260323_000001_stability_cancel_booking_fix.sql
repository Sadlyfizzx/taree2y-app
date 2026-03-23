create extension if not exists pgcrypto;

create or replace function public.hours_until_trip_departure(
  p_departure_date date,
  p_departure_time time without time zone
)
returns numeric
language sql
stable
set search_path = public
as $$
  select
    extract(
      epoch from (
        ((p_departure_date + p_departure_time) - timezone('Africa/Cairo', now()))
      )
    ) / 3600.0;
$$;

comment on function public.hours_until_trip_departure(date, time without time zone)
is 'Returns Cairo-local hours until trip departure without invalid interval arithmetic.';

create or replace function public.cancel_booking_atomic(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_trip public.trip_instances%rowtype;
  v_wallet public.app_wallets%rowtype;
  v_base_fee numeric(6,2) := 0.20;
  v_fee_ratio numeric(6,2) := 0.20;
  v_refund numeric(12,2) := 0;
  v_hours_to_departure numeric(12,2) := 0;
begin
  if v_user is null then
    return jsonb_build_object(
      'ok', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Unauthorized'
    );
  end if;

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
    and user_id = v_user
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error_code', 'BOOKING_NOT_FOUND',
      'message', 'الحجز غير موجود'
    );
  end if;

  if v_booking.status = 'cancelled' then
    return jsonb_build_object(
      'ok', false,
      'error_code', 'BOOKING_ALREADY_CANCELLED',
      'message', 'الحجز ملغي بالفعل'
    );
  end if;

  if v_booking.status <> 'upcoming' then
    return jsonb_build_object(
      'ok', false,
      'error_code', 'BOOKING_NOT_CANCELLABLE',
      'message', 'الرحلة دي غير قابلة للإلغاء الآن'
    );
  end if;

  select *
  into v_trip
  from public.trip_instances
  where id = v_booking.trip_instance_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error_code', 'TRIP_INSTANCE_NOT_FOUND',
      'message', 'بيانات الرحلة غير موجودة'
    );
  end if;

  v_hours_to_departure := public.hours_until_trip_departure(
    v_trip.departure_date,
    v_trip.departure_time
  );

  if v_hours_to_departure <= 2 then
    return jsonb_build_object(
      'ok', false,
      'error_code', 'CANCELLATION_WINDOW_CLOSED',
      'message', 'فات وقت الإلغاء المسموح (أقل من ساعتين على التحرك)'
    );
  end if;

  if v_trip.company = 'سوبر جيت' then
    v_base_fee := 0.15;
  elsif v_trip.company = 'بلو باص' then
    v_base_fee := 0.25;
  else
    v_base_fee := 0.20;
  end if;

  v_fee_ratio := v_base_fee;
  if v_hours_to_departure > 24 then
    v_fee_ratio := greatest(0.10, v_base_fee - 0.05);
  elsif v_hours_to_departure <= 6 then
    v_fee_ratio := least(0.75, v_base_fee + 0.15);
  end if;

  v_refund := greatest(0, round(v_booking.final_total * (1 - v_fee_ratio)));

  insert into public.app_wallets (user_id, balance, points, subscription)
  values (v_user, 0, 0, 'none')
  on conflict (user_id) do nothing;

  select *
  into v_wallet
  from public.app_wallets
  where user_id = v_user
  for update;

  update public.bookings
  set
    status = 'cancelled',
    points_awarded = false,
    trip_data =
      case
        when trip_data is null then jsonb_build_object('status', 'cancelled')
        else jsonb_set(trip_data, '{status}', to_jsonb('cancelled'::text), true)
      end,
    updated_at = now()
  where id = v_booking.id;

  update public.trip_seats
  set
    status = 'available',
    booking_id = null,
    held_by_user_id = null,
    hold_token = null,
    hold_expires_at = null,
    updated_at = now()
  where booking_id = v_booking.id;

  update public.trip_instances
  set
    available_seats_count = (
      select count(*)
      from public.trip_seats
      where trip_instance_id = v_trip.id
        and status = 'available'
    ),
    updated_at = now()
  where id = v_trip.id;

  update public.app_wallets
  set
    balance = coalesce(v_wallet.balance, 0) + v_refund,
    updated_at = now()
  where user_id = v_user;

  insert into public.app_wallet_transactions (
    user_id,
    client_id,
    type,
    amount,
    txn_date,
    description,
    payload
  )
  values (
    v_user,
    'REFUND-' || v_booking.id::text,
    'credit',
    v_refund,
    current_date,
    'استرداد تذكرة ' || coalesce(v_booking.pnr, v_booking.id::text),
    jsonb_build_object(
      'booking_id', v_booking.id,
      'pnr', v_booking.pnr,
      'refund_amount', v_refund,
      'fee_ratio', v_fee_ratio,
      'hours_to_departure', v_hours_to_departure
    )
  )
  on conflict (client_id) do nothing;

  return jsonb_build_object(
    'ok', true,
    'bookingId', v_booking.id,
    'pnr', v_booking.pnr,
    'refundAmount', v_refund,
    'feeRatio', v_fee_ratio,
    'hoursToDeparture', round(v_hours_to_departure, 2),
    'status', 'cancelled'
  );
end;
$$;

grant execute on function public.cancel_booking_atomic(uuid) to authenticated;
grant execute on function public.hours_until_trip_departure(date, time without time zone) to authenticated;
