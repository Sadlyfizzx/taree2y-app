export function getRemainingHoldMs(holdExpiresAt) {
  if (!holdExpiresAt) return null;
  const expiresAtMs = new Date(holdExpiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) return null;
  return Math.max(0, expiresAtMs - Date.now());
}

export function buildTripDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const dateTime = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
}

export function getTripWindow(tripLike) {
  const start = buildTripDateTime(tripLike?.date, tripLike?.departureTime);
  const end = buildTripDateTime(tripLike?.date, tripLike?.arrivalTime);
  if (!start || !end) return null;
  if (end.getTime() <= start.getTime()) {
    end.setDate(end.getDate() + 1);
  }
  return { start, end };
}

export function isTripActiveForOverlap(tripLike, now = Date.now()) {
  const status = String(tripLike?.status || '').trim();
  if (["cancelled", "past"].includes(status)) return false;
  const window = getTripWindow(tripLike);
  if (!window) return ["upcoming", "refund_pending"].includes(status);
  return window.end.getTime() > now;
}

export function findOverlappingTrip(nextTrip, existingTrips = [], now = Date.now()) {
  const nextWindow = getTripWindow(nextTrip);
  if (!nextWindow) return null;
  const candidates = Array.isArray(existingTrips) ? existingTrips : [];
  return candidates.find((tripLike) => {
    if (!tripLike) return false;
    if (!isTripActiveForOverlap(tripLike, now)) return false;
    const existingWindow = getTripWindow(tripLike);
    if (!existingWindow) return false;
    return nextWindow.start.getTime() < existingWindow.end.getTime() && existingWindow.start.getTime() < nextWindow.end.getTime();
  }) || null;
}

export function buildOverlapWarningKey(nextTrip, existingTrip) {
  return [
    nextTrip?.instanceId || nextTrip?.bookingId || nextTrip?.id || nextTrip?.pnr || 'next',
    existingTrip?.bookingId || existingTrip?.id || existingTrip?.pnr || 'existing',
  ].join('::');
}

