import { supabase } from './supabase';

const warned = new Set();
const warnOnce = (key, message, error) => {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message, error);
};

const asNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

const normalizeTransaction = (txn, index = 0) => {
  const baseId = txn?.client_id || txn?.clientId || txn?.id || `txn-${txn?.type || 'entry'}-${txn?.date || ''}-${txn?.amount || 0}-${index}`;
  const clientId = String(baseId);
  return {
    id: String(txn?.id || clientId),
    client_id: clientId,
    type: txn?.type === 'credit' ? 'credit' : 'debit',
    amount: asNumber(txn?.amount, 0),
    date: txn?.date || new Date().toISOString().slice(0, 10),
    desc: txn?.desc || txn?.description || 'عملية على المحفظة',
    created_at: txn?.created_at || txn?.createdAt || new Date().toISOString(),
    payload: { ...txn, id: String(txn?.id || clientId), client_id: clientId },
  };
};

const normalizeBooking = (booking, index = 0) => {
  const baseId = booking?.client_id || booking?.clientId || booking?.pnr || booking?.id || `booking-${booking?.from || ''}-${booking?.to || ''}-${booking?.date || ''}-${index}`;
  const clientId = String(baseId);
  return {
    id: String(booking?.id || clientId),
    client_id: clientId,
    pnr: booking?.pnr || clientId,
    status: booking?.status || 'upcoming',
    booking_date: booking?.bookingDate || booking?.booking_date || booking?.date || new Date().toISOString().slice(0, 10),
    final_total: asNumber(booking?.finalTotal ?? booking?.final_total, 0),
    payment_method: booking?.paymentMethod || booking?.payment_method || 'wallet',
    selected_seats: asArray(booking?.selectedSeats || booking?.selected_seats),
    ticket_token: booking?.ticketToken || booking?.ticket_token || null,
    qr_payload: booking?.qrPayload || booking?.qr_payload || null,
    trip_data: {
      ...booking,
      id: String(booking?.id || clientId),
      client_id: clientId,
      pnr: booking?.pnr || clientId,
      selectedSeats: asArray(booking?.selectedSeats || booking?.selected_seats),
      finalTotal: asNumber(booking?.finalTotal ?? booking?.final_total, 0),
      paymentMethod: booking?.paymentMethod || booking?.payment_method || 'wallet',
      bookingDate: booking?.bookingDate || booking?.booking_date || booking?.date || new Date().toISOString().slice(0, 10),
    },
  };
};

const isMissingColumnError = (error, column) =>
  error?.code === 'PGRST204' && typeof error?.message === 'string' && error.message.includes(`'${column}'`);

export async function loadSupabaseAppState(userId) {
  if (!userId) return { data: { wallet: 0, transactions: [], myTrips: [], points: 0, subscription: 'none' }, error: null };

  const [walletRes, txRes, bookingsRes] = await Promise.all([
    supabase.from('app_wallets').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('app_wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('bookings').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);

  const firstError = walletRes.error || txRes.error || bookingsRes.error;
  if (firstError) return { data: null, error: firstError };

  const transactions = dedupeBy((txRes.data || []).map((row, index) => {
    const payload = row.payload || {};
    return {
      id: row.id || row.client_id || payload.id || `tx-${index}`,
      client_id: row.client_id || payload.client_id || row.id || `tx-${index}`,
      type: (row.type || payload.type) === 'credit' ? 'credit' : 'debit',
      amount: asNumber(row.amount ?? payload.amount, 0),
      date: row.txn_date || payload.date || new Date(row.created_at || Date.now()).toISOString().slice(0, 10),
      desc: row.description || payload.desc || 'عملية على المحفظة',
      created_at: row.created_at,
    };
  }), (item) => item.client_id || item.id);

  const myTrips = dedupeBy((bookingsRes.data || []).map((row, index) => {
    const tripData = row.trip_data || row.trip_payload || row.payload || {};
    const selectedSeats = asArray(row.selected_seats || tripData.selectedSeats || tripData.selected_seats);
    return {
      ...tripData,
      id: row.id || tripData.id || row.client_id || row.pnr || `booking-${index}`,
      bookingId: row.id || tripData.bookingId || tripData.id || row.client_id || row.pnr || `booking-${index}`,
      tripInstanceId: row.trip_instance_id || tripData.tripInstanceId || tripData.instanceId || null,
      tripCode: tripData.tripCode || tripData.trip_code || null,
      client_id: row.client_id || tripData.client_id || tripData.id || row.pnr || `booking-${index}`,
      pnr: row.pnr || tripData.pnr || row.client_id || `booking-${index}`,
      status: row.status || tripData.status || 'upcoming',
      bookingDate: row.booking_date || tripData.bookingDate || tripData.booking_date || tripData.date || new Date(row.created_at || Date.now()).toISOString().slice(0, 10),
      finalTotal: asNumber(row.final_total ?? tripData.finalTotal ?? tripData.final_total, 0),
      paymentMethod: row.payment_method || tripData.paymentMethod || tripData.payment_method || 'wallet',
      selectedSeats,
      ticketToken: row.ticket_token || tripData.ticketToken || tripData.ticket_token || null,
      qrPayload: row.qr_payload || tripData.qrPayload || tripData.qr_payload || null,
      luggage: row.luggage ?? tripData.luggage ?? false,
      ride: row.ride ?? tripData.ride ?? false,
      access: row.access ?? tripData.access ?? false,
      earnedPointsPending: row.earned_points_pending ?? tripData.earnedPointsPending ?? 0,
      pointsAwarded: row.points_awarded ?? tripData.pointsAwarded ?? false,
    };
  }), (item) => item.client_id || item.pnr || item.id);

  return { data: { wallet: asNumber(walletRes.data?.balance, 0), points: asNumber(walletRes.data?.points, 0), subscription: walletRes.data?.subscription || 'none', transactions, myTrips }, error: null };
}

export async function saveSupabaseAppState(_userId, _state) {
  return {
    ok: false,
    code: 'backend_required',
    message:
      'تم إيقاف حفظ snapshot شامل من الفرونت بعد Phase 6.5. استخدم عمليات الباك إند الذرية ثم اعمل refresh للحالة.',
    error: null,
  };
}
