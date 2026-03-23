import { supabase } from './supabase';

const WALLET_TABLE = 'app_wallets';
const TX_TABLE = 'app_wallet_transactions';
const BOOKINGS_TABLE = 'bookings';
const BATCH_SIZE = 100;

const isoNow = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().slice(0, 10);
const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const chunkArray = (items, size = BATCH_SIZE) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const makeStableId = (prefix = 'id') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const dedupeBy = (items, getKey) => {
  const map = new Map();
  for (const item of items || []) {
    const key = getKey(item);
    if (!key) continue;
    map.set(String(key), item);
  }
  return Array.from(map.values());
};

const sortTransactions = (items) => {
  return [...(items || [])].sort((a, b) => {
    const ad = new Date(a?.date || a?.txn_date || a?.created_at || 0).getTime();
    const bd = new Date(b?.date || b?.txn_date || b?.created_at || 0).getTime();
    return bd - ad;
  });
};

const sortBookings = (items) => {
  return [...(items || [])].sort((a, b) => {
    const aTs = new Date(`${a?.date || a?.trip_date || '1970-01-01'}T${a?.departureTime || a?.departure_time || '00:00'}:00`).getTime();
    const bTs = new Date(`${b?.date || b?.trip_date || '1970-01-01'}T${b?.departureTime || b?.departure_time || '00:00'}:00`).getTime();
    return bTs - aTs;
  });
};

const normalizeTransactionRow = (txn, userId) => {
  const clientId = String(txn?.clientId || txn?.id || makeStableId('txn'));
  const type = txn?.type || txn?.txn_type || 'debit';
  const desc = txn?.desc || txn?.description || '';
  const date = txn?.date || txn?.txn_date || todayDate();
  const amount = toNumber(txn?.amount, 0);

  return {
    user_id: userId,
    client_id: clientId,
    txn_type: type,
    amount,
    description: desc,
    txn_date: date,
    payload: {
      ...txn,
      id: txn?.id || clientId,
      clientId,
      type,
      desc,
      amount,
      date,
    },
    updated_at: isoNow(),
  };
};

const normalizeBookingRow = (trip, userId) => {
  const clientId = String(trip?.clientId || trip?.pnr || trip?.id || makeStableId('booking'));
  const pnr = String(trip?.pnr || clientId);
  const date = trip?.date || trip?.trip_date || null;
  const departureTime = trip?.departureTime || trip?.departure_time || null;

  return {
    user_id: userId,
    client_id: clientId,
    pnr,
    status: trip?.status || 'upcoming',
    trip_date: date,
    departure_time: departureTime,
    booking_date: trip?.bookingDate || trip?.booking_date || todayDate(),
    final_total: toNumber(trip?.finalTotal, 0),
    earned_points_pending: toNumber(trip?.earnedPointsPending, 0),
    points_awarded: Boolean(trip?.pointsAwarded),
    trip_payload: {
      ...trip,
      clientId,
      pnr,
      date,
      departureTime,
      bookingDate: trip?.bookingDate || trip?.booking_date || todayDate(),
      finalTotal: toNumber(trip?.finalTotal, 0),
      earnedPointsPending: toNumber(trip?.earnedPointsPending, 0),
      pointsAwarded: Boolean(trip?.pointsAwarded),
    },
    updated_at: isoNow(),
  };
};

const hydrateTransaction = (row) => {
  const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
  return {
    ...payload,
    id: payload.id || row?.client_id || makeStableId('txn-local'),
    clientId: payload.clientId || row?.client_id,
    type: payload.type || row?.txn_type || 'debit',
    amount: toNumber(payload.amount ?? row?.amount, 0),
    desc: payload.desc || row?.description || '',
    date: payload.date || row?.txn_date || todayDate(),
  };
};

const hydrateBooking = (row) => {
  const payload = row?.trip_payload && typeof row.trip_payload === 'object' ? row.trip_payload : {};
  return {
    ...payload,
    clientId: payload.clientId || row?.client_id,
    pnr: payload.pnr || row?.pnr,
    status: payload.status || row?.status || 'upcoming',
    date: payload.date || row?.trip_date || null,
    departureTime: payload.departureTime || row?.departure_time || null,
    bookingDate: payload.bookingDate || row?.booking_date || todayDate(),
    finalTotal: toNumber(payload.finalTotal ?? row?.final_total, 0),
    earnedPointsPending: toNumber(payload.earnedPointsPending ?? row?.earned_points_pending, 0),
    pointsAwarded: Boolean(payload.pointsAwarded ?? row?.points_awarded),
  };
};

async function upsertInChunks(table, rows, onConflict) {
  for (const chunk of chunkArray(rows)) {
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw error;
  }
}

export async function loadSupabaseAppState(userId) {
  const baseData = {
    wallet: 0,
    points: 0,
    subscription: 'none',
    transactions: [],
    myTrips: [],
  };

  try {
    const walletRes = await supabase
      .from(WALLET_TABLE)
      .select('user_id, balance, points, subscription, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (walletRes.error) throw walletRes.error;

    baseData.wallet = toNumber(walletRes.data?.balance, 0);
    baseData.points = toNumber(walletRes.data?.points, 0);
    baseData.subscription = walletRes.data?.subscription || 'none';
  } catch (error) {
    return { data: baseData, error };
  }

  try {
    const txRes = await supabase
      .from(TX_TABLE)
      .select('client_id, txn_type, amount, description, txn_date, payload, created_at, updated_at')
      .eq('user_id', userId);

    if (txRes.error) throw txRes.error;
    baseData.transactions = sortTransactions((txRes.data || []).map(hydrateTransaction));
  } catch (error) {
    console.error('loadSupabaseAppState transactions error', error);
  }

  try {
    const bookingsRes = await supabase
      .from(BOOKINGS_TABLE)
      .select('client_id, pnr, status, trip_date, departure_time, booking_date, final_total, earned_points_pending, points_awarded, trip_payload, created_at, updated_at')
      .eq('user_id', userId);

    if (bookingsRes.error) throw bookingsRes.error;
    baseData.myTrips = sortBookings((bookingsRes.data || []).map(hydrateBooking));
  } catch (error) {
    console.error('loadSupabaseAppState bookings error', error);
  }

  return { data: baseData, error: null };
}

export async function saveSupabaseAppState(userId, state) {
  const walletValue = toNumber(state?.wallet, 0);
  const pointsValue = toNumber(state?.points, 0);
  const subscriptionValue = state?.subscription || 'none';

  const txRows = dedupeBy(
    (state?.transactions || []).map((txn) => normalizeTransactionRow(txn, userId)),
    (row) => row.client_id
  );

  const bookingRows = dedupeBy(
    (state?.myTrips || []).map((trip) => normalizeBookingRow(trip, userId)),
    (row) => row.pnr
  );

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
