export function buildTripPublicTrackingUrl(ticket) {
  const trackingUrl = String(ticket?.publicTrackingUrl || '').trim();
  if (trackingUrl) return trackingUrl;

  const publicToken = String(ticket?.publicShareToken || ticket?.public_token || '').trim();
  if (!publicToken) return '';

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  return `${origin}/public/trip/${encodeURIComponent(publicToken)}`;
}
