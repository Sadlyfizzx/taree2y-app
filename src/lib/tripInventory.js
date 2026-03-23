import { supabase } from './supabase';
import {
  createLogger,
  isMissingRpcError,
  normalizeSupabaseError,
} from './logger';
import { generateTrips } from '../app/utils/travel';

const log = createLogger('trip-inventory');
const HOLD_MINUTES = 5;

const toTimeText = (value) => {
  if (!value) return '';
  const text = String(value);
  return text.length >= 5 ? text.slice(0, 5) : text;
};

const mapTripRow = (row) => ({
  id: row.trip_code || row.id,
  instanceId: row.id,
  tripCode: row.trip_code || row.id,
  from: row.from_city,
  to: row.to_city,
  date: row.departure_date,
  departureTime: toTimeText(row.departure_time),
  arrivalTime: toTimeText(row.arrival_time),
  durationHour: Number(row.duration_hours ?? 0),
  price: Number(row.price ?? 0),
  company: row.company,
  class: row.service_class,
  rating: String(row.rating ?? '4.5'),
  badge: row.badge || null,
  hasRestStop: Boolean(row.has_rest_stop),
  capacity: Number(row.capacity ?? 40),
  availableSeatsCount: Number(row.available_seats_count ?? 0),
  driver: row.driver_name
    ? {
        name: row.driver_name,
        rating: Number(row.driver_rating ?? 4.5),
        trips: Number(row.driver_trips ?? 0),
        img: row.driver_img || '👨🏽‍✈️',
      }
    : null,
});

const mapSeatRow = (row, currentUserId) => ({
  id: row.id || row.seat_number,
  number: row.seat_number,
  status:
    row.status === 'booked'
      ? 'booked'
      : row.status === 'held'
      ? 'held'
      : 'available',
  heldByCurrentUser: Boolean(
    currentUserId && row.held_by_user_id && row.held_by_user_id === currentUserId,
  ),
  holdExpiresAt: row.hold_expires_at || null,
});

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user?.id ?? null;
}

function normalizeRpcPayload(operation, data) {
  if (data && typeof data === 'object' && 'ok' in data) {
    if (data.ok) {
      log.info(`${operation}_rpc_success`, data);
    } else {
      log.warn(`${operation}_rpc_rejected`, data);
    }
    return data;
  }

  log.info(`${operation}_rpc_success`, { wrapped: true });
  return { ok: true, data };
}

function toRpcFailure(operation, error, fallbackMessage) {
  const normalized = normalizeSupabaseError(error);
  const errorClass = isMissingRpcError(error) ? 'missing_rpc' : 'rpc_error';

  const payload = {
    ok: false,
    errorClass,
    message: normalized.message || fallbackMessage,
    code: normalized.code || null,
    httpStatus: normalized.status || null,
    details: normalized.details || null,
    hint: normalized.hint || null,
  };

  log.error(`${operation}_rpc_failed`, payload);
  return payload;
}

export async function searchTripInventory({
  from,
  to,
  date,
  passengers = 1,
}) {
  log.info('search_started', {
    from,
    to,
    date,
    passengers,
  });

  try {
    const seedResult = await supabase.rpc('seed_trip_inventory_for_search', {
      p_from_city: from,
      p_to_city: to,
      p_departure_date: date,
    });

    if (seedResult.error && !isMissingRpcError(seedResult.error)) {
      throw seedResult.error;
    }

    const { data, error } = await supabase
      .from('trip_instances')
      .select('*')
      .eq('from_city', from)
      .eq('to_city', to)
      .eq('departure_date', date)
      .order('departure_time', { ascending: true });

    if (error) {
      throw error;
    }

    const trips = (data || [])
      .map(mapTripRow)
      .filter(
        (trip) => Number(trip.availableSeatsCount ?? 0) >= Number(passengers),
      );

    log.info('search_completed', {
      from,
      to,
      date,
      passengers,
      count: trips.length,
      source: 'supabase',
    });

    return {
      trips,
      isDirect: trips.length > 0,
      source: 'supabase',
    };
  } catch (error) {
    log.warn('search_fallback_used', {
      from,
      to,
      date,
      passengers,
      error,
    });

    return {
      ...generateTrips(from, to, date),
      source: 'fallback',
    };
  }
}

export async function loadTripSeats(tripInstanceId) {
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('trip_seats')
    .select(
      'id, seat_number, seat_index, status, held_by_user_id, hold_expires_at',
    )
    .eq('trip_instance_id', tripInstanceId)
    .order('seat_index', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => mapSeatRow(row, currentUserId));
}

export async function hydrateTripWithSeats(trip) {
  if (!trip?.instanceId) return trip;

  const seats = await loadTripSeats(trip.instanceId);
  const activeHold =
    seats.find((seat) => seat.heldByCurrentUser && seat.holdExpiresAt)
      ?.holdExpiresAt || null;

  return {
    ...trip,
    seats,
    holdExpiresAt: activeHold,
  };
}

export async function holdTripSeats({ tripInstanceId, seatNumbers }) {
  log.info('hold_trip_seats_started', {
    tripInstanceId,
    seatsRequested: Array.isArray(seatNumbers) ? seatNumbers.length : 0,
  });

  const { data, error } = await supabase.rpc('hold_trip_seats', {
    p_trip_instance_id: tripInstanceId,
    p_seat_numbers: seatNumbers,
    p_hold_minutes: HOLD_MINUTES,
  });

  if (error) {
    return toRpcFailure(
      'hold_trip_seats',
      error,
      'تعذر تثبيت المقاعد مؤقتاً',
    );
  }

  return normalizeRpcPayload('hold_trip_seats', data);
}

export async function createBookingAtomic({
  tripInstanceId,
  seatNumbers,
  passengers,
  promoCode,
  hasLuggage,
  rideToStation,
  needsAccess,
}) {
  log.info('create_booking_atomic_started', {
    tripInstanceId,
    seatsRequested: Array.isArray(seatNumbers) ? seatNumbers.length : 0,
    passengers,
    hasPromoCode: Boolean(String(promoCode || '').trim()),
    hasLuggage: Boolean(hasLuggage),
    rideToStation: Boolean(rideToStation),
    needsAccess: Boolean(needsAccess),
  });

  const { data, error } = await supabase.rpc('create_booking_atomic', {
    p_trip_instance_id: tripInstanceId,
    p_seat_numbers: seatNumbers,
    p_passengers: passengers,
    p_promo_code: String(promoCode || '').trim().toUpperCase() || null,
    p_has_luggage: Boolean(hasLuggage),
    p_ride_to_station: Boolean(rideToStation),
    p_needs_access: Boolean(needsAccess),
  });

  if (error) {
    return toRpcFailure('create_booking_atomic', error, 'تعذر إنشاء الحجز');
  }

  return normalizeRpcPayload('create_booking_atomic', data);
}

export async function cancelBookingAtomic({ bookingId }) {
  log.info('cancel_booking_atomic_started', {
    bookingId,
  });

  const { data, error } = await supabase.rpc('cancel_booking_atomic', {
    p_booking_id: bookingId,
  });

  if (error) {
    return toRpcFailure('cancel_booking_atomic', error, 'تعذر إلغاء الحجز');
  }

  return normalizeRpcPayload('cancel_booking_atomic', data);
}
