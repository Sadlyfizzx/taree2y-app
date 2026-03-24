import { supabase } from '../../lib/supabase';

export function getAppOrigin() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function isPublicPortalPath(pathname = '') {
  return (
    pathname.startsWith('/public/trip/') ||
    pathname.startsWith('/t/') ||
    pathname.startsWith('/public/wallet-topup')
  );
}

export function getPublicTripTokenFromPath(pathname = '') {
  if (pathname.startsWith('/public/trip/')) {
    return pathname.replace('/public/trip/', '').trim();
  }

  if (pathname.startsWith('/t/')) {
    return pathname.replace('/t/', '').trim();
  }

  return '';
}

export function buildPublicTripUrl(token) {
  return `${getAppOrigin()}/public/trip/${token}`;
}

export function buildWalletTopupUrl({ userId, amount, requestId }) {
  const params = new URLSearchParams();
  params.set('uid', String(userId || '').trim());
  params.set('amount', String(Number(amount || 0)));
  params.set('req', String(requestId || '').trim());
  return `${getAppOrigin()}/public/wallet-topup?${params.toString()}`;
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

export async function copyTextWithFallback(text) {
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
    return copied;
  } catch {
    return false;
  }
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

export async function publicTopupWallet({ userId, amount, requestId }) {
  const { data, error } = await supabase.rpc('public_topup_wallet', {
    p_user_id: userId,
    p_amount: Number(amount),
    p_request_id: requestId,
    p_payment_channel: 'public_qr',
  });

  if (error) throw error;
  return data;
}
