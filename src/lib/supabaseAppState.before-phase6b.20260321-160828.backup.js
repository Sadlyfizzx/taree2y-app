import { supabase } from './supabase';

const WALLET_TABLE = 'app_wallets';
const TX_TABLE = 'app_wallet_transactions';
const BOOKINGS_TABLE = 'bookings';
const BATCH_SIZE = 100;

const isoNow = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().slice(0, 10);

const chunkArray = (items, size = BATCH_SIZE) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const makeStableId = (prefix = 'id') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeTransactionRow = (txn, userId) => {
  const clientId = String(txn?.clientId || txn?.id || makeStableId('txn'));

  return {
    user_id: userId,
    client_id: clientId,
    txn_type: txn?.type || txn?.txn_type || 'debit',
    amount: Number(txn?.amount || 0),
    description: txn?.desc || txn?.description || '',
    txn_date: txn?.date || txn?.txn_date || todayDate(),
    payload: {
      ...txn,
      id: txn?.id || clientId,
      clientId,
      type: txn?.type || txn?.txn_type || 'debit',
      desc: txn?.desc || txn?.description || '',
      amount: Number(txn?.amount || 0),
      date: txn?.date || txn?.txn_date || todayDate(),
    },
    updated_at: isoNow(),
  };
};

const normalizeBookingRow = (trip, userId) => {
  const clientId = String(trip?.clientId || trip?.pnr || trip?.id || makeStableId('booking'));
  const pnr = String(trip?.pnr || clientId);

  return {
    user_id: userId,
    client_id: clientId,
    pnr,
    status: trip?.status || 'upcoming',
    trip_date: trip?.date || null,
    departure_time: trip?.departureTime || null,
    booking_date: trip?.bookingDate || todayDate(),
    final_total: Number(trip?.finalTotal || 0),
    earned_points_pending: Number(trip?.earnedPointsPending || 0),
    points_awarded: Boolean(trip?.pointsAwarded),
    trip_payload: {
      ...trip,
      clientId,
      pnr,
      status: trip?.status || 'upcoming',
      bookingDate: trip?.bookingDate || todayDate(),
      finalTotal: Number(trip?.finalTotal || 0),
      earnedPointsPending: Number(trip?.earnedPointsPending || 0),
      pointsAwarded: Boolean(trip?.pointsAwarded),
    },
    updated_at: isoNow(),
  };
};

const hydrateTransaction = (row) => {
  const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};

  return {
    ...payload,
    id: payload.id || row.client_id,
    clientId: payload.clientId || row.client_id,
    type: payload.type || row.txn_type || 'debit',
    amount: Number(payload.amount ?? row.amount ?? 0),
    desc: payload.desc || row.description || '',
    date: payload.date || row.txn_date || todayDate(),
  };
};

const hydrateBooking = (row) => {
  const payload = row?.trip_payload && typeof row.trip_payload === 'object' ? row.trip_payload : {};

  return {
    ...payload,
    clientId: payload.clientId || row.client_id,
    pnr: payload.pnr || row.pnr,
    status: payload.status || row.status || 'upcoming',
    date: payload.date || row.trip_date || null,
    departureTime: payload.departureTime || row.departure_time || null,
    bookingDate: payload.bookingDate || row.booking_date || todayDate(),
    finalTotal: Number(payload.finalTotal ?? row.final_total ?? 0),
    earnedPointsPending: Number(payload.earnedPointsPending ?? row.earned_points_pending ?? 0),
    pointsAwarded: Boolean(payload.pointsAwarded ?? row.points_awarded),
  };
};

async function upsertInChunks(table, rows, onConflict) {
  const chunks = chunkArray(rows);
  for (const chunk of chunks) {
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict });

    if (error) throw error;
  }
}

export async function loadSupabaseAppState(userId) {
  try {
    const [walletRes, txRes, bookingsRes] = await Promise.all([
      supabase
        .from(WALLET_TABLE)
        .select('user_id, balance, points, subscription')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from(TX_TABLE)
        .select('client_id, txn_type, amount, description, txn_date, payload, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from(BOOKINGS_TABLE)
        .select('client_id, pnr, status, trip_date, departure_time, booking_date, final_total, earned_points_pending, points_awarded, trip_payload, created_at')
        .eq('user_id', userId)
        .order('trip_date', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);

    if (walletRes.error) throw walletRes.error;
    if (txRes.error) throw txRes.error;
    if (bookingsRes.error) throw bookingsRes.error;

    return {
      data: {
        wallet: Number(walletRes.data?.balance || 0),
        points: Number(walletRes.data?.points || 0),
        subscription: walletRes.data?.subscription || 'none',
        transactions: (txRes.data || []).map(hydrateTransaction),
        myTrips: (bookingsRes.data || []).map(hydrateBooking),
      },
      error: null,
    };
  } catch (error) {
    return {
      data: {
        wallet: 0,
        points: 0,
        subscription: 'none',
        transactions: [],
        myTrips: [],
      },
      error,
    };
  }
}

export async function saveSupabaseAppState(userId, state) {
  const walletValue = Number(state?.wallet || 0);
  const pointsValue = Number(state?.points || 0);
  const subscriptionValue = state?.subscription || 'none';

  const txRows = (state?.transactions || []).map((txn) => normalizeTransactionRow(txn, userId));
  const bookingRows = (state?.myTrips || []).map((trip) => normalizeBookingRow(trip, userId));

  const { error: walletError } = await supabase
    .from(WALLET_TABLE)
    .upsert(
      {
        user_id: userId,
        balance: walletValue,
        points: pointsValue,
        subscription: subscriptionValue,
        updated_at: isoNow(),
      },
      { onConflict: 'user_id' }
    );

  if (walletError) throw walletError;

  if (txRows.length > 0) {
    await upsertInChunks(TX_TABLE, txRows, 'client_id');
  }

  if (bookingRows.length > 0) {
    await upsertInChunks(BOOKINGS_TABLE, bookingRows, 'pnr');
  }

  return { ok: true };
}

