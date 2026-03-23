import { supabase } from './supabase';
import { createLogger } from './logger';

const log = createLogger('supabase-app-state');

const warned = new Set();
const warnOnce = (key, message, error) => {
  if (warned.has(key)) return;
  warned.add(key);
  log.warn(message, error);
};

const asNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const dedupeBy = (items, getKey) => {
  const map = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    map.set(String(key), item);
  }
  return Array.from(map.values());
};

const isMissingColumnError = (error, column) =>
  error?.code === 'PGRST204' &&
  typeof error?.message === 'string' &&
  error.message.includes(`'${column}'`);

const normalizeTransaction = (txn, index = 0) => {
  if (!txn || txn.source === 'cloud') return null;

  const baseId =
    txn?.client_id ||
    txn?.clientId ||
    txn?.id ||
    `txn-${txn?.type || 'entry'}-${txn?.date || ''}-${txn?.amount || 0}-${index}`;
  const clientId = String(baseId);

  return {
    client_id: clientId,
    type: txn?.type === 'credit' ? 'credit' : 'debit',
    amount: asNumber(txn?.amount, 0),
    date: txn?.date || new Date().toISOString().slice(0, 10),
    desc: txn?.desc || txn?.description || 'عملية على المحفظة',
    created_at: txn?.created_at || txn?.createdAt || new Date().toISOString(),
    payload: {
      ...txn,
      client_id: clientId,
    },
  };
};

const normalizeBooking = (booking, index = 0) => {
  if (!booking || booking.source === 'cloud') return null;

  const baseId =
    booking?.client_id ||
    booking?.clientId ||
    booking?.id ||
    booking?.bookingId ||
    booking?.pnr ||
    `booking-${index}`;
  const clientId = String(baseId);

  return {
    client_id: clientId,
    pnr: booking?.pnr || clientId,
    status: booking?.status || 'upcoming',
    booking_date:
      booking?.bookingDate ||
      booking?.booking_date ||
      booking?.date ||
      new Date().toISOString().slice(0, 10),
    final_total: asNumber(booking?.finalTotal ?? booking?.final_total, 0),
    payment_method: booking?.paymentMethod || booking?.payment_method || 'wallet',
    selected_seats: asArray(booking?.selectedSeats || booking?.selected_seats),
    trip_data: {
      ...booking,
      client_id: clientId,
    },
  };
};

export async function loadSupabaseAppState(userId) {
  if (!userId) {
    return {
      data: {
        wallet: 0,
        transactions: [],
        myTrips: [],
        points: 0,
        subscription: 'none',
      },
      error: null,
    };
  }

  const [walletRes, txRes, bookingsRes] = await Promise.all([
    supabase.from('app_wallets').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('app_wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const firstError = walletRes.error || txRes.error || bookingsRes.error;
  if (firstError) {
    return { data: null, error: firstError };
  }

  const transactions = dedupeBy(
    (txRes.data || []).map((row, index) => {
      const payload = row.payload || {};
      return {
        id: row.id || row.client_id || payload.id || `tx-${index}`,
        client_id: row.client_id || payload.client_id || null,
        source: 'cloud',
        type: (row.type || payload.type) === 'credit' ? 'credit' : 'debit',
        amount: asNumber(row.amount ?? payload.amount, 0),
        date:
          row.txn_date ||
          payload.date ||
          new Date(row.created_at || Date.now()).toISOString().slice(0, 10),
        desc: row.description || payload.desc || 'عملية على المحفظة',
        created_at: row.created_at,
      };
    }),
    (item) => item.client_id || item.id,
  );

  const myTrips = dedupeBy(
    (bookingsRes.data || []).map((row, index) => {
      const tripData = row.trip_data || row.trip_payload || row.payload || {};
      const selectedSeats = asArray(
        row.selected_seats || tripData.selectedSeats || tripData.selected_seats,
      );

      return {
        ...tripData,
        id:
          row.id ||
          tripData.id ||
          row.client_id ||
          row.pnr ||
          `booking-${index}`,
        bookingId:
          row.id ||
          tripData.bookingId ||
          tripData.id ||
          row.client_id ||
          row.pnr ||
          `booking-${index}`,
        tripInstanceId:
          row.trip_instance_id ||
          tripData.tripInstanceId ||
          tripData.instanceId ||
          null,
        client_id: row.client_id || tripData.client_id || null,
        source: 'cloud',
        pnr: row.pnr || tripData.pnr || row.client_id || `booking-${index}`,
        status: row.status || tripData.status || 'upcoming',
        bookingDate:
          row.booking_date ||
          tripData.bookingDate ||
          tripData.booking_date ||
          tripData.date ||
          new Date(row.created_at || Date.now()).toISOString().slice(0, 10),
        finalTotal: asNumber(
          row.final_total ?? tripData.finalTotal ?? tripData.final_total,
          0,
        ),
        paymentMethod:
          row.payment_method ||
          tripData.paymentMethod ||
          tripData.payment_method ||
          'wallet',
        selectedSeats,
        ticketToken:
          row.ticket_token ||
          tripData.ticketToken ||
          tripData.ticket_token ||
          null,
        qrPayload:
          row.qr_payload || tripData.qrPayload || tripData.qr_payload || null,
        luggage: row.luggage ?? tripData.luggage ?? false,
        ride: row.ride ?? tripData.ride ?? false,
        access: row.access ?? tripData.access ?? false,
        earnedPointsPending:
          row.earned_points_pending ?? tripData.earnedPointsPending ?? 0,
        pointsAwarded: row.points_awarded ?? tripData.pointsAwarded ?? false,
      };
    }),
    (item) => item.bookingId || item.client_id || item.pnr || item.id,
  );

  return {
    data: {
      wallet: asNumber(walletRes.data?.balance, 0),
      points: asNumber(walletRes.data?.points, 0),
      subscription: walletRes.data?.subscription || 'none',
      transactions,
      myTrips,
    },
    error: null,
  };
}

export async function saveSupabaseAppState(userId, state) {
  if (!userId) return { error: null };

  const nowIso = new Date().toISOString();

  const walletPayload = {
    user_id: userId,
    balance: asNumber(state?.wallet, 0),
    points: asNumber(state?.points, 0),
    subscription: state?.subscription || 'none',
    updated_at: nowIso,
  };

  const txPayload = dedupeBy(
    asArray(state?.transactions)
      .map((txn, index) => normalizeTransaction(txn, index))
      .filter(Boolean),
    (item) => item.client_id,
  ).map((txn) => ({
    user_id: userId,
    client_id: txn.client_id,
    type: txn.type,
    amount: txn.amount,
    txn_date: txn.date,
    description: txn.desc,
    payload: txn.payload,
    created_at: txn.created_at || nowIso,
    updated_at: nowIso,
  }));

  const bookingsPayload = dedupeBy(
    asArray(state?.myTrips)
      .map((booking, index) => normalizeBooking(booking, index))
      .filter(Boolean),
    (item) => item.client_id,
  ).map((booking) => ({
    user_id: userId,
    client_id: booking.client_id,
    pnr: booking.pnr,
    status: booking.status,
    booking_date: booking.booking_date,
    final_total: booking.final_total,
    payment_method: booking.payment_method,
    selected_seats: booking.selected_seats,
    trip_data: booking.trip_data,
    updated_at: nowIso,
  }));

  const walletResult = await supabase
    .from('app_wallets')
    .upsert(walletPayload, { onConflict: 'user_id' });
  if (walletResult.error) throw walletResult.error;

  if (txPayload.length > 0) {
    const txResult = await supabase
      .from('app_wallet_transactions')
      .upsert(txPayload, { onConflict: 'client_id' });

    if (txResult.error) {
      if (isMissingColumnError(txResult.error, 'type')) {
        warnOnce(
          'app_wallet_transactions.type',
          'legacy_app_wallet_transactions_schema_detected',
          txResult.error,
        );

        const legacyPayload = txPayload.map((txn) => ({
          user_id: userId,
          client_id: txn.client_id,
          payload: txn.payload,
          created_at: txn.created_at || nowIso,
          updated_at: nowIso,
        }));

        const legacyResult = await supabase
          .from('app_wallet_transactions')
          .upsert(legacyPayload, { onConflict: 'client_id' });

        if (legacyResult.error) {
          warnOnce(
            'app_wallet_transactions.legacy',
            'legacy_app_wallet_transactions_write_failed',
            legacyResult.error,
          );
        }
      } else {
        throw txResult.error;
      }
    }
  }

  if (bookingsPayload.length > 0) {
    const bookingsResult = await supabase
      .from('bookings')
      .upsert(bookingsPayload, { onConflict: 'client_id' });

    if (bookingsResult.error) {
      if (
        isMissingColumnError(bookingsResult.error, 'pnr') ||
        isMissingColumnError(bookingsResult.error, 'status')
      ) {
        warnOnce('bookings.legacy', 'legacy_bookings_schema_detected', bookingsResult.error);

        const legacyPayload = bookingsPayload.map((booking) => ({
          user_id: userId,
          client_id: booking.client_id,
          trip_data: booking.trip_data,
          updated_at: nowIso,
        }));

        const legacyResult = await supabase
          .from('bookings')
          .upsert(legacyPayload, { onConflict: 'client_id' });

        if (legacyResult.error) {
          warnOnce(
            'bookings.legacy.write',
            'legacy_bookings_write_failed',
            legacyResult.error,
          );
        }
      } else {
        throw bookingsResult.error;
      }
    }
  }

  log.debug('save_completed', {
    userId,
    txRows: txPayload.length,
    bookingRows: bookingsPayload.length,
  });

  return { error: null };
}
