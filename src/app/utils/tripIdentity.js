const CITY_CODES = {
  'القاهرة': 'CAI',
  'الجيزة': 'GZA',
  'الإسكندرية': 'ALX',
  'مرسى مطروح': 'MAT',
  'بورسعيد': 'PSD',
  'الإسماعيلية': 'ISM',
  'السويس': 'SUE',
  'دمياط': 'DMT',
  'شرم الشيخ': 'SSH',
  'الغردقة': 'HRG',
  'دهب': 'DHB',
  'طابا': 'TBA',
  'المنصورة': 'MNS',
  'سوهاج': 'SOH',
  'قنا': 'QNA',
  'الأقصر': 'LXR',
  'أسوان': 'ASW',
};

function compactDate(dateValue) {
  if (!dateValue) return '000000';
  const safe = String(dateValue).replaceAll('-', '');
  return safe.length >= 8 ? safe.slice(2, 8) : safe.padEnd(6, '0');
}

function compactTime(timeValue) {
  if (!timeValue) return '0000';
  return String(timeValue).replace(':', '').slice(0, 4).padEnd(4, '0');
}

function safeTail(value, fallback = '0000') {
  const clean = String(value || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  return clean ? clean.slice(-4).padStart(4, '0') : fallback;
}

export function getCityShortCode(city) {
  return CITY_CODES[city] || 'TRP';
}

export function buildPublicTripCode(ticket) {
  const from = getCityShortCode(ticket?.from);
  const to = getCityShortCode(ticket?.to);
  const date = compactDate(ticket?.date);
  const time = compactTime(ticket?.departureTime);
  const tail = safeTail(ticket?.pnr || ticket?.bookingId || ticket?.id);
  return `TRQ-${from}-${to}-${date}-${time}-${tail}`;
}

export function buildDriverRunCode(ticket) {
  const from = getCityShortCode(ticket?.from);
  const to = getCityShortCode(ticket?.to);
  const date = compactDate(ticket?.date);
  const time = compactTime(ticket?.departureTime);
  return `DRV-${from}-${to}-${date}-${time}`;
}

export function ensureTicketIdentity(ticket) {
  if (!ticket) return ticket;

  const publicTripCode = ticket.publicTripCode || buildPublicTripCode(ticket);
  const driverRunCode = ticket.driverRunCode || buildDriverRunCode(ticket);
  const publicShareSeed =
    ticket.publicShareSeed ||
    `${publicTripCode}-${safeTail(ticket?.bookingId || ticket?.pnr || ticket?.id, 'A001')}`;

  return {
    ...ticket,
    publicTripCode,
    driverRunCode,
    publicShareSeed,
  };
}
