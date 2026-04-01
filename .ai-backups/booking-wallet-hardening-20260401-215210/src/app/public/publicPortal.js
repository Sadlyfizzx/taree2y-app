import { supabase } from '../../lib/supabase';

export const WALLET_TOPUP_FIXED_FEE = 3;
export const WALLET_TOPUP_PERCENT_FEE = 0.025;

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export function getAppOrigin() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function isPublicPortalPath(pathname = '') {
  return pathname.startsWith('/trip/') || pathname.startsWith('/t/') || pathname.startsWith('/wallet-topup');
}

export function getPublicTripTokenFromPath(pathname = '') {
  if (pathname.startsWith('/trip/')) {
    return pathname.replace('/trip/', '').trim();
  }

  if (pathname.startsWith('/t/')) {
    return pathname.replace('/t/', '').trim();
  }

  return '';
}

export function buildPublicTripUrl(token) {
  return `${getAppOrigin()}/trip/${token}`;
}

export function calculateWalletTopupBreakdown(inputAmount) {
  const grossAmount = Math.max(0, roundMoney(inputAmount));
  if (!grossAmount) {
    return { grossAmount: 0, feeAmount: 0, netAmount: 0 };
  }

  const rawFee = roundMoney(Math.max(WALLET_TOPUP_FIXED_FEE, grossAmount * WALLET_TOPUP_PERCENT_FEE));
  const feeAmount = Math.min(grossAmount, rawFee);
  const netAmount = Math.max(0, roundMoney(grossAmount - feeAmount));
  return { grossAmount, feeAmount, netAmount };
}

export function buildWalletTopupUrl({ requestId }) {
  const params = new URLSearchParams();
  params.set('req', String(requestId || '').trim());
  return `${getAppOrigin()}/wallet-topup?${params.toString()}`;
}

export function buildWalletTopupClientId(requestId) {
  const safe = String(requestId || '').trim();
  if (!safe) return `topup-${Date.now()}`;
  return `topup-${safe}`;
}

export function getWalletTopupPaidStorageKey(requestId) {
  return `taree2y_topup_paid_${String(requestId || '').trim()}`;
}

export function readWalletTopupPaidState(requestId) {
  const safeRequestId = String(requestId || '').trim();
  if (typeof window === 'undefined' || !safeRequestId) return null;

  try {
    const raw = window.localStorage.getItem(getWalletTopupPaidStorageKey(safeRequestId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.requestId !== safeRequestId || parsed.paid !== true) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function markWalletTopupPaid(requestId, payload = {}) {
  const safeRequestId = String(requestId || '').trim();
  if (typeof window === 'undefined' || !safeRequestId) return;

  try {
    window.localStorage.setItem(
      getWalletTopupPaidStorageKey(safeRequestId),
      JSON.stringify({
        paid: true,
        requestId: safeRequestId,
        markedAt: new Date().toISOString(),
        userId: String(payload.userId || '').trim(),
        grossAmount: roundMoney(payload.grossAmount),
        creditAmount: roundMoney(payload.creditAmount),
        feeAmount: roundMoney(payload.feeAmount),
        clientId: String(payload.clientId || '').trim(),
      }),
    );
  } catch {
    // ignore storage errors; backend request status remains the source of truth
  }
}

export async function copyTextWithFallback(text, label = 'الرابط') {
  const safeText = String(text || '').trim();
  if (!safeText) return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(safeText);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = safeText;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (copied) return true;
  } catch {
    // prompt fallback below
  }

  try {
    if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
      window.prompt(`انسخ ${label} يدويًا`, safeText);
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function normalizeWalletTopupRequestPayload(payload) {
  const source = payload && typeof payload === 'object'
    ? payload.request && typeof payload.request === 'object'
      ? payload.request
      : payload
    : null;

  if (!source) return null;

  const requestId = String(source.requestId || source.request_id || '').trim();
  if (!requestId) return null;

  const grossAmount = roundMoney(source.grossAmount ?? source.gross_amount ?? source.amount ?? 0);
  const feeAmount = roundMoney(source.feeAmount ?? source.fee_amount ?? source.fee ?? 0);
  const creditAmount = roundMoney(source.creditAmount ?? source.credit_amount ?? source.netAmount ?? source.net_amount ?? source.credit ?? 0);
  const status = String(source.status || '').trim().toLowerCase() || 'issued';

  return {
    requestId,
    userId: String(source.userId || source.user_id || '').trim(),
    grossAmount,
    feeAmount,
    creditAmount,
    paymentChannel: String(source.paymentChannel || source.payment_channel || '').trim() || 'public_qr',
    status,
    isPaid: Boolean(source.isPaid ?? source.is_paid ?? status == 'paid'),
    expiresAt: String(source.expiresAt || source.expires_at || '').trim(),
    paidAt: String(source.paidAt || source.paid_at || '').trim(),
    createdAt: String(source.createdAt || source.created_at || '').trim(),
    url: buildWalletTopupUrl({ requestId }),
    raw: source,
  };
}

function normalizeWalletTopupActionResult(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const request = normalizeWalletTopupRequestPayload(source);
  const explicitOk =
    typeof source.ok === 'boolean'
      ? source.ok
      : typeof source.success === 'boolean'
      ? source.success
      : null;
  const inferredOk = Boolean(
    explicitOk === true ||
      source.alreadyPaid === true ||
      source.already_paid === true ||
      request?.isPaid ||
      request?.status === 'paid'
  );

  return {
    ok: inferredOk,
    alreadyPaid: Boolean(source.alreadyPaid ?? source.already_paid ?? request?.isPaid),
    message: String(source.message || '').trim(),
    request,
    raw: source,
  };
}

function normalizePublicTripSharePayload(payload) {
  const source = payload && typeof payload === 'object'
    ? payload.payload && typeof payload.payload === 'object'
      ? payload.payload
      : payload
    : null;

  if (!source) return null;

  const from = String(source.from || '').trim();
  const to = String(source.to || '').trim();
  const date = String(source.date || '').trim();
  const departureTime = String(source.departureTime || source.departure_time || '').trim();
  const arrivalTime = String(source.arrivalTime || source.arrival_time || '').trim();

  if (!from || !to || !date || !departureTime || !arrivalTime) {
    return null;
  }

  return {
    ...source,
    from,
    to,
    date,
    departureTime,
    arrivalTime,
  };
}

export async function createPublicTripShare(payload) {
  const { data, error } = await supabase.rpc('create_public_trip_share', {
    p_payload: payload,
  });

  if (error) throw error;

  const token = data?.token || data?.share_token || data?.id || null;
  if (!token) {
    throw new Error('Failed to create public trip share token');
  }

  return {
    token,
    url: buildPublicTripUrl(token),
  };
}

export async function getPublicTripShare(token) {
  const { data, error } = await supabase.rpc('get_public_trip_share', {
    p_token: token,
  });

  if (error) throw error;
  return normalizePublicTripSharePayload(data);
}

export async function issueWalletTopupRequest({
  userId,
  amount,
  paymentChannel = 'public_qr',
}) {
  const { data, error } = await supabase.rpc('issue_public_wallet_topup_request', {
    p_user_id: userId,
    p_amount: Number(amount),
    p_payment_channel: paymentChannel,
  });

  if (error) throw error;
  const request = normalizeWalletTopupRequestPayload(data);
  if (!request?.requestId) {
    throw new Error('wallet_topup_issue_contract_invalid');
  }
  return request;
}

export async function getPublicWalletTopupRequest(requestId) {
  const safeRequestId = String(requestId || '').trim();
  if (!safeRequestId) return null;

  const { data, error } = await supabase.rpc('get_public_wallet_topup_request', {
    p_request_id: safeRequestId,
  });

  if (error) throw error;
  return normalizeWalletTopupRequestPayload(data);
}

export async function confirmPublicWalletTopupRequest({
  requestId,
  paymentChannel = 'public_qr',
  clientId,
}) {
  const safeRequestId = String(requestId || '').trim();
  const safeClientId = String(clientId || buildWalletTopupClientId(safeRequestId)).trim();

  const { data, error } = await supabase.rpc('confirm_public_wallet_topup_request', {
    p_request_id: safeRequestId,
    p_payment_channel: paymentChannel,
    p_client_id: safeClientId,
  });

  if (error) throw error;
  const result = normalizeWalletTopupActionResult(data);
  if (!result.request?.requestId) {
    return {
      ...result,
      ok: false,
      message: result.message || 'استجابة تأكيد الشحن من السيرفر ناقصة أو غير مفهومة.',
    };
  }
  return result;
}

export async function publicTopupWallet({
  userId,
  amount,
  requestId,
  paymentChannel = 'public_qr',
  clientId,
}) {
  const safeRequestId = String(requestId || '').trim();
  const safeClientId = String(clientId || buildWalletTopupClientId(safeRequestId)).trim();

  const { data, error } = await supabase.rpc('public_topup_wallet', {
    p_user_id: userId,
    p_amount: Number(amount),
    p_request_id: safeRequestId,
    p_payment_channel: paymentChannel,
    p_client_id: safeClientId,
  });

  if (error) throw error;
  return data;
}
