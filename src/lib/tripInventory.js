import { supabase } from './supabase';
import { createLogger } from './logger';
import { generateTrips } from '../app/utils/travel';
import { getPrimaryStationName, withStationNames } from '../app/utils/stations';

const log = createLogger('trip-inventory');
const HOLD_MINUTES = 5;
const ALLOW_DEMO_FALLBACK =
  String(import.meta.env?.VITE_ENABLE_DEMO_FALLBACK || '').toLowerCase() === 'true';

const toTimeText = (value) => {
  if (!value) return '';
  const stringValue = String(value);
  return stringValue.length >= 5 ? stringValue.slice(0, 5) : stringValue;
};

const asNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const mapSeatRow = (row, currentUserId) => ({
  id: row.id || row.seat_number,
  number: row.seat_number,
  status:
    row.status === 'booked' ? 'booked' : row.status === 'held' ? 'held' : 'available',
  heldByCurrentUser: Boolean(
    currentUserId && row.held_by_user_id && row.held_by_user_id === currentUserId,
  ),
  holdExpiresAt: row.hold_expires_at || null,
});

const mapTripRow = (row) =>
  withStationNames({
    id: row.trip_code || row.id,
    instanceId: row.id,
    tripCode: row.trip_code || row.id,
    from: row.from_city,
    to: row.to_city,
    fromStationName: row.from_station_name || getPrimaryStationName(row.from_city),
    toStationName: row.to_station_name || getPrimaryStationName(row.to_city),
    date: row.departure_date,
    departureTime: toTimeText(row.departure_time),
    arrivalTime: toTimeText(row.arrival_time),
    durationHour: asNumber(row.duration_hours, 0),
    price: asNumber(row.price, 0),
    company: row.company,
    class: row.service_class,
    rating: String(row.rating ?? '4.5'),
    badge: row.badge || null,
    hasRestStop: Boolean(row.has_rest_stop),
    capacity: asNumber(row.capacity, 40),
    availableSeatsCount: asNumber(row.available_seats_count, 0),
    bookingCutoffMinutes: asNumber(row.booking_cutoff_minutes, 120),
    luggageAllowanceKg: asNumber(row.luggage_allowance_kg, 20),
    driver: row.driver_name
      ? {
          name: row.driver_name,
          rating: asNumber(row.driver_rating, 4.5),
          trips: asNumber(row.driver_trips, 0),
          img: row.driver_img || '👨🏽‍✈️',
        }
      : null,
  });

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user?.id ?? null;
}

function normalizeInvoice(invoice) {
  if (!invoice) return null;
  return {
    ...invoice,
    total: asNumber(invoice.total, 0),
    items: Array.isArray(invoice.items)
      ? invoice.items.map((item) => ({
          name: item?.name || 'بند',
          price: asNumber(item?.price, 0),
        }))
      : [],
  };
}

function normalizeBooking(booking) {
  if (!booking) return null;

  const payload = {
    ...booking,
    id: booking.id || booking.bookingId || null,
    bookingId: booking.bookingId || booking.id || null,
    tripInstanceId: booking.tripInstanceId || booking.instanceId || null,
    instanceId: booking.instanceId || booking.tripInstanceId || null,
    tripCode: booking.tripCode || booking.trip_code || null,
    pnr: booking.pnr || booking.bookingRef || null,
    finalTotal: asNumber(booking.finalTotal ?? booking.final_total, 0),
    price: asNumber(booking.price, 0),
    durationHour: asNumber(booking.durationHour ?? booking.duration_hours, 0),
    bookingCutoffMinutes: asNumber(
      booking.bookingCutoffMinutes ?? booking.booking_cutoff_minutes,
      120,
    ),
    luggageAllowanceKg: asNumber(
      booking.luggageAllowanceKg ?? booking.luggage_allowance_kg,
      20,
    ),
    selectedSeats: Array.isArray(booking.selectedSeats || booking.selected_seats)
      ? booking.selectedSeats || booking.selected_seats
      : [],
    fromStationName:
      booking.fromStationName || booking.from_station_name || getPrimaryStationName(booking.from),
    toStationName:
      booking.toStationName || booking.to_station_name || getPrimaryStationName(booking.to),
    qrPayload: booking.qrPayload || booking.qr_payload || null,
    ticketToken: booking.ticketToken || booking.ticket_token || null,
  };

  return withStationNames(payload);
}

function normalizeRpcResult(result) {
  if (!result) {
    return { ok: false, message: 'Empty response from server' };
  }

  if (typeof result !== 'object') {
    return { ok: true, data: result };
  }

  const bookingPayload = normalizeBooking(result.booking);
  const invoicePayload = normalizeInvoice(result.invoice);

  return {
    ...result,
    ok: result.ok ?? true,
    booking: bookingPayload,
    invoice: invoicePayload,
    refundAmount: asNumber(result.refundAmount, 0),
  };
}

export async function ensureTripInventoryForSearch({ from, to, date }) {
  const { data, error } = await supabase.rpc('seed_trip_inventory_for_search', {
    p_from_city: from,
    p_to_city: to,
    p_departure_date: date,
  });

  if (error) {
    throw error;
  }

  return normalizeRpcResult(data);
}

export async function searchTripInventory({ from, to, date, passengers = 1 }) {
  try {
    const seedResult = await ensureTripInventoryForSearch({ from, to, date });

    if (seedResult.ok === false) {
      if (String(seedResult.code || '').toLowerCase() === 'no_direct_route') {
        return {
          trips: [],
          isDirect: false,
          source: 'supabase',
        };
      }

      throw new Error(seedResult.message || 'Trip inventory seed failed');
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

    const requestedPassengers = Math.max(1, Number(passengers) || 1);
    const trips = (data || [])
      .map(mapTripRow)
      .filter((trip) => asNumber(trip.availableSeatsCount, 0) >= requestedPassengers);

    return {
      trips,
      isDirect: true,
      source: 'supabase',
    };
  } catch (error) {
    log.warn('search_inventory_failed', { from, to, date, passengers, error });

    if (!ALLOW_DEMO_FALLBACK) {
      throw error;
    }

    return {
      ...generateTrips(from, to, date),
      source: 'fallback',
    };
  }
}

export async function loadTripSeats(tripInstanceId) {
  const currentUserId = await getCurrentUserId();

  await supabase.rpc('release_expired_seat_holds').catch(() => null);

  const { data, error } = await supabase
    .from('trip_seats')
    .select('id, seat_number, seat_index, status, hold_expires_at, held_by_user_id')
    .eq('trip_instance_id', tripInstanceId)
    .order('seat_index', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => mapSeatRow(row, currentUserId));
}

export async function hydrateTripWithSeats(trip) {
  if (!trip?.instanceId) return withStationNames(trip);

  const seats = await loadTripSeats(trip.instanceId);
  const activeHold =
    seats.find((seat) => seat.heldByCurrentUser && seat.holdExpiresAt)?.holdExpiresAt || null;

  return withStationNames({
    ...trip,
    seats,
    holdExpiresAt: activeHold || trip?.holdExpiresAt || null,
  });
}

export async function holdTripSeats({ tripInstanceId, seatNumbers }) {
  const { data, error } = await supabase.rpc('hold_trip_seats', {
    p_trip_instance_id: tripInstanceId,
    p_seat_numbers: seatNumbers,
    p_hold_minutes: HOLD_MINUTES,
  });

  if (error) {
    return {
      ok: false,
      message: error.message || 'تعذر تثبيت المقاعد مؤقتاً',
      code: error.code || 'rpc_error',
    };
  }

  return normalizeRpcResult(data);
}

export async function releaseSeatHold({ tripInstanceId }) {
  const { data, error } = await supabase.rpc('release_my_seat_hold', {
    p_trip_instance_id: tripInstanceId,
  });

  if (error) {
    return {
      ok: false,
      message: error.message || 'تعذر تحرير تثبيت المقاعد',
      code: error.code || 'rpc_error',
    };
  }

  return normalizeRpcResult(data);
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
  const { data, error } = await supabase.rpc('create_booking_atomic', {
    p_trip_instance_id: tripInstanceId,
    p_seat_numbers: seatNumbers,
    p_passengers: passengers,
    p_promo_code: promoCode?.trim() ? promoCode.trim().toUpperCase() : null,
    p_has_luggage: Boolean(hasLuggage),
    p_ride_to_station: Boolean(rideToStation),
    p_needs_access: Boolean(needsAccess),
  });

  if (error) {
    return {
      ok: false,
      message: error.message || 'تعذر إنشاء الحجز',
      code: error.code || 'rpc_error',
    };
  }

  return normalizeRpcResult(data);
}

export async function cancelBookingAtomic({ bookingId }) {
  const { data, error } = await supabase.rpc('cancel_booking_atomic', {
    p_booking_id: bookingId,
  });

  if (error) {
    return {
      ok: false,
      message: error.message || 'تعذر إلغاء الحجز',
      code: error.code || 'rpc_error',
    };
  }

  return normalizeRpcResult(data);
}
