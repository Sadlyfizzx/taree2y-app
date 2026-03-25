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

export function buildWalletTopupUrl({ userId, amount, requestId }) {
  const { grossAmount, feeAmount, netAmount } = calculateWalletTopupBreakdown(amount);
  const params = new URLSearchParams();
  params.set('uid', String(userId || '').trim());
  params.set('amount', String(grossAmount));
  params.set('fee', String(feeAmount));
  params.set('credit', String(netAmount));
  params.set('req', String(requestId || '').trim());
  return `${getAppOrigin()}/wallet-topup?${params.toString()}`;
}

export function createWalletRequestId() {
  const now = new Date();
  const stamp = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');

  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TOP-${stamp}-${random}`;
}

export function buildWalletTopupClientId(requestId) {
  const safe = String(requestId || '').trim();
  if (!safe) return `topup-${Date.now()}`;
  return `topup-${safe}`;
}

export function getWalletTopupPaidStorageKey(requestId) {
  return `taree2y_topup_paid_${String(requestId || '').trim()}`;
}

export function readWalletTopupPaidState(_requestId) {
  return null;
}

export function markWalletTopupPaid(_requestId, _payload = {}) {
  // backend-only mode: top-up confirmation must be read from the backend, not browser storage
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
  return data?.payload || data || null;
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
