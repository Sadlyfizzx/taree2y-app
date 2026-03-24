import { buildDriverRunCode, buildPublicTripCode } from './routeCodes';

function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function toBase64Url(value) {
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4 || 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  const decoded = decodeURIComponent(escape(atob(padded)));
  return decoded;
}

export function getRequestedPublicRoute() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('publicRoute');
}

export function buildPublicTrackingPayload(ticket) {
  if (!ticket) return null;
  return {
    from: ticket.from,
    to: ticket.to,
    date: ticket.date,
    departureTime: ticket.departureTime,
    arrivalTime: ticket.arrivalTime,
    durationHour: ticket.durationHour,
    company: ticket.company,
    class: ticket.class,
    driver: ticket.driver || null,
    fromStationName: ticket.fromStationName || null,
    toStationName: ticket.toStationName || null,
    publicTripCode: buildPublicTripCode(ticket),
    driverRunCode: buildDriverRunCode(ticket),
  };
}

export function buildPublicTrackingLink(ticket) {
  if (ticket?.publicTrackingUrl) return ticket.publicTrackingUrl;
  if (typeof window === 'undefined') return '';
  const payload = toBase64Url(buildPublicTrackingPayload(ticket));
  const params = new URLSearchParams({ publicRoute: 'track', payload });
  return `${window.location.origin}/?${params.toString()}`;
}

export function readPublicTrackingPayloadFromLocation() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('payload');
  if (!raw) return null;
  return safeJsonParse(fromBase64Url(raw), null);
}

export function buildWalletTopupLink(requestId, token) {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams({
    publicRoute: 'wallet-topup',
    id: String(requestId || ''),
    token: String(token || ''),
  });
  return `${window.location.origin}/?${params.toString()}`;
}

export function readWalletTopupRequestFromLocation() {
  if (typeof window === 'undefined') return { requestId: null, token: null };
  const params = new URLSearchParams(window.location.search);
  return {
    requestId: params.get('id'),
    token: params.get('token'),
  };
}
