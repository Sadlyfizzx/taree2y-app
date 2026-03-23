import { supabase } from './supabase';

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDateOnly = (value) => {
  if (!value) return null;
  const text = String(value);
  return text.includes('T') ? text.slice(0, 10) : text;
};

const normalizeTransactionType = (kind) => {
  if (kind === 'debit') return 'debit';
  return 'credit';
};

const toTransactionKind = (type) => {
  if (type === 'debit') return 'debit';
  if (type === 'refund') return 'refund';
  if (type === 'redeem') return 'redeem';
  if (type === 'promo_adjustment') return 'promo_adjustment';
  return 'credit';
};

const sortTransactionsDesc = (rows) => {
  return [...rows].sort((a, b) => {
    const ad = a?.date || '';
    const bd = b?.date || '';
    return bd.localeCompare(ad);
  });
};

const sortTripsDesc = (rows) => {
  return [...rows].sort((a, b) => {
    const aDate = `${a?.date || ''}T${a?.departureTime || '00:00'}:00`;
    const bDate = `${b?.date || ''}T${b?.departureTime || '00:00'}:00`;
    return bDate.localeCompare(aDate);
  });
};

export async function loadSupabaseAppState(userId) {
  try {
    const [profileRes, walletRes, transactionsRes, bookingsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('loyalty_points, subscription_plan')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('app_wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('app_wallet_transactions')
        .select('client_id, kind, amount, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('bookings')
        .select('pnr, status, total_amount, earned_points, points_awarded, booking_snapshot, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (walletRes.error) throw walletRes.error;
    if (transactionsRes.error) throw transactionsRes.error;
    if (bookingsRes.error) throw bookingsRes.error;

    const wallet = toNumber(walletRes.data?.balance, 0);
    const points = toNumber(profileRes.data?.loyalty_points, 0);
    const subscription = profileRes.data?.subscription_plan || 'none';

    const transactions = sortTransactionsDesc((transactionsRes.data || []).map((row) => ({
      id: row.client_id || `txn-${row.created_at || Math.random().toString(36).slice(2, 8)}`,
      type: normalizeTransactionType(row.kind),
      amount: toNumber(row.amount, 0),
      date: toDateOnly(row.created_at) || '',
      desc: row.description || '',
    })));

    const myTrips = sortTripsDesc((bookingsRes.data || []).map((row) => {
      const snapshot = row.booking_snapshot || {};
      return {
        ...snapshot,
        pnr: row.pnr,
        status: row.status,
        finalTotal: toNumber(row.total_amount, snapshot.finalTotal || 0),
        earnedPointsPending: toNumber(row.earned_points, snapshot.earnedPointsPending || 0),
        pointsAwarded: Boolean(row.points_awarded),
      };
    }));

    return {
      data: {
        wallet,
        transactions,
        myTrips,
        points,
        subscription,
      },
      error: null,
    };
  } catch (error) {
    console.error('loadSupabaseAppState error', error);
    return {
      data: {
        wallet: 0,
        transactions: [],
        myTrips: [],
        points: 0,
        subscription: 'none',
      },
      error,
    };
  }
}

export async function saveSupabaseAppState(userId, state) {
  const wallet = toNumber(state.wallet, 0);
  const points = toNumber(state.points, 0);
  const subscription = state.subscription || 'none';
  const transactions = Array.isArray(state.transactions) ? state.transactions : [];
  const myTrips = Array.isArray(state.myTrips) ? state.myTrips : [];

  const walletPayload = {
    user_id: userId,
    balance: wallet,
    currency: 'EGP',
    updated_at: new Date().toISOString(),
  };

  const profilePayload = {
    loyalty_points: points,
    subscription_plan: subscription,
  };

  const transactionRows = transactions.map((txn, index) => ({
    user_id: userId,
    client_id: txn.id || `txn-${index}-${Date.now()}`,
    kind: toTransactionKind(txn.type),
    amount: toNumber(txn.amount, 0),
    description: txn.desc || '',
    metadata: {},
    created_at: txn.date ? `${txn.date}T12:00:00` : new Date().toISOString(),
  }));

  const inventoryRows = myTrips.map((trip) => ({
    trip_key: trip.id,
    from_city: trip.from,
    to_city: trip.to,
    trip_date: trip.date,
    departure_time: trip.departureTime,
    arrival_time: trip.arrivalTime,
    company: trip.company,
    seat_class: trip.class,
    price: toNumber(trip.price, 0),
    capacity: 40,
    route_meta: {
      durationHour: trip.durationHour,
      hasRestStop: !!trip.hasRestStop,
    },
    updated_at: new Date().toISOString(),
  }));

  const bookingRows = myTrips.map((trip) => ({
    pnr: trip.pnr,
    user_id: userId,
    trip_key: trip.id,
    status: trip.status || 'upcoming',
    total_amount: toNumber(trip.finalTotal, 0),
    promo_code: null,
    luggage: !!trip.luggage,
    ride_to_station: !!trip.ride,
    access_support: !!trip.access,
    earned_points: toNumber(trip.earnedPointsPending, 0),
    points_awarded: !!trip.pointsAwarded,
    booking_snapshot: trip,
    updated_at: new Date().toISOString(),
  }));

  const nowIso = new Date().toISOString();

  const { error: walletError } = await supabase
    .from('app_wallets')
    .upsert(walletPayload, { onConflict: 'user_id' });
  if (walletError) throw walletError;

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profilePayload)
    .eq('id', userId);
  if (profileError) throw profileError;

  if (inventoryRows.length > 0) {
    const { error: inventoryError } = await supabase
      .from('trip_inventory')
      .upsert(inventoryRows, { onConflict: 'trip_key' });
    if (inventoryError) throw inventoryError;
  }

  const { error: deleteTransactionsError } = await supabase
    .from('app_wallet_transactions')
    .delete()
    .eq('user_id', userId);
  if (deleteTransactionsError) throw deleteTransactionsError;

  if (transactionRows.length > 0) {
    const { error: insertTransactionsError } = await supabase
      .from('app_wallet_transactions')
      .insert(transactionRows);
    if (insertTransactionsError) throw insertTransactionsError;
  }

  const { data: existingBookings, error: existingBookingsError } = await supabase
    .from('bookings')
    .select('id')
    .eq('user_id', userId);
  if (existingBookingsError) throw existingBookingsError;

  if ((existingBookings || []).length > 0) {
    const bookingIds = existingBookings.map((row) => row.id);
    const { error: deletePassengersError } = await supabase
      .from('booking_passengers')
      .delete()
      .in('booking_id', bookingIds);
    if (deletePassengersError) throw deletePassengersError;
  }

  const { error: deleteBookingsError } = await supabase
    .from('bookings')
    .delete()
    .eq('user_id', userId);
  if (deleteBookingsError) throw deleteBookingsError;

  if (bookingRows.length > 0) {
    const rowsWithTimestamps = bookingRows.map((row) => ({
      ...row,
      created_at: row.booking_snapshot?.bookingDate ? `${row.booking_snapshot.bookingDate}T12:00:00` : nowIso,
    }));

    const { data: insertedBookings, error: insertBookingsError } = await supabase
      .from('bookings')
      .insert(rowsWithTimestamps)
      .select('id, pnr');
    if (insertBookingsError) throw insertBookingsError;

    const bookingIdByPnr = new Map((insertedBookings || []).map((row) => [row.pnr, row.id]));
    const passengerRows = [];

    for (const trip of myTrips) {
      const bookingId = bookingIdByPnr.get(trip.pnr);
      if (!bookingId) continue;

      const selectedSeats = Array.isArray(trip.selectedSeats) ? trip.selectedSeats : [];
      for (const seatNumber of selectedSeats) {
        passengerRows.push({
          booking_id: bookingId,
          seat_number: seatNumber,
          passenger_name: null,
          passenger_phone: null,
        });
      }
    }

    if (passengerRows.length > 0) {
      const { error: passengerError } = await supabase
        .from('booking_passengers')
        .insert(passengerRows);
      if (passengerError) throw passengerError;
    }
  }

  return { ok: true };
}
