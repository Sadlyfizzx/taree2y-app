import { withStationNames } from './stations';
import { ensureTicketIdentity } from './tripIdentity';

function encodeBase64Url(value) {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = padded + '==='.slice((padded.length + 3) % 4);
  return decodeURIComponent(escape(atob(normalized)));
}

export function buildPublicTripPayload(ticket) {
  const data = withStationNames(ensureTicketIdentity(ticket));
  return {
    v: 1,
    publicTripCode: data.publicTripCode,
    driverRunCode: data.driverRunCode,
    shareSeed: data.publicShareSeed,
    pnr: data.pnr || null,
    from: data.from,
    to: data.to,
    fromStationName: data.fromStationName,
    toStationName: data.toStationName,
    date: data.date,
    departureTime: data.departureTime,
    arrivalTime: data.arrivalTime,
    durationHour: data.durationHour,
    company: data.company,
    class: data.class,
    driver: data.driver || null,
    hasRestStop: Boolean(data.hasRestStop),
    luggage: Boolean(data.luggage),
    ride: Boolean(data.ride),
    access: Boolean(data.access),
    issuedAt: Date.now(),
  };
}

export function encodePublicTripPayload(payload) {
  return encodeBase64Url(JSON.stringify(payload));
}

export function decodePublicTripPayload(token) {
  if (!token) return null;

  try {
    const parsed = JSON.parse(decodeBase64Url(token));
    if (!parsed?.from || !parsed?.to || !parsed?.date || !parsed?.departureTime) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildPublicTripUrl(ticket) {
  if (typeof window === 'undefined') return '';
  const payload = buildPublicTripPayload(ticket);
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('publicTrip', encodePublicTripPayload(payload));
  return url.toString();
}

export function readPublicTripPayloadFromLocation(searchString) {
  const source =
    typeof searchString === 'string'
      ? searchString
      : typeof window !== 'undefined'
      ? window.location.search
      : '';

  const params = new URLSearchParams(source);
  const token = params.get('publicTrip');
  return decodePublicTripPayload(token);
}

export async function copyShareUrl(text) {
  if (!text) return false;

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    document.body.removeChild(textArea);
    return false;
  }
}
