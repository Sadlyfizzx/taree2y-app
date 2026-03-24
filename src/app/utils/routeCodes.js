const CITY_CODE_MAP = {
  'القاهرة': 'CAI',
  'الجيزة': 'GIZ',
  'الإسكندرية': 'ALX',
  'المنصورة': 'MNS',
  'أسوان': 'ASW',
  'الأقصر': 'LXR',
  'دمياط': 'DAM',
  'بورسعيد': 'PSD',
  'الإسماعيلية': 'ISM',
  'السويس': 'SUE',
  'مرسى مطروح': 'MAT',
  'شرم الشيخ': 'SSH',
  'الغردقة': 'HRG',
  'دهب': 'DHB',
  'طابا': 'TBA',
  'سوهاج': 'SOH',
  'قنا': 'QEN',
};

function normalizeAscii(value = '') {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function compactDate(dateValue) {
  const text = String(dateValue || '').trim();
  if (!text) return '000000';
  const parts = text.split('-');
  if (parts.length !== 3) return text.replace(/\D/g, '').slice(-6) || '000000';
  const [year, month, day] = parts;
  return `${day.padStart(2, '0')}${month.padStart(2, '0')}${year.slice(-2)}`;
}

function compactTime(timeValue) {
  return String(timeValue || '0000').replace(/\D/g, '').slice(0, 4).padEnd(4, '0');
}

function fallbackCityCode(city = '') {
  const collapsed = normalizeAscii(city);
  if (!collapsed) return 'XXX';
  return collapsed.slice(0, 3).padEnd(3, 'X');
}

export function getCityCode(city) {
  return CITY_CODE_MAP[city] || fallbackCityCode(city);
}

function buildStableSuffix(ticket) {
  const candidates = [ticket?.pnr, ticket?.bookingId, ticket?.id, ticket?.ticketToken];
  const raw = candidates.find(Boolean);
  const cleaned = normalizeAscii(raw || '0000');
  if (!cleaned) return '0000';
  return cleaned.slice(-4).padStart(4, '0');
}

export function buildDriverRunCode(ticket) {
  if (ticket?.driverRunCode) return ticket.driverRunCode;
  const fromCode = getCityCode(ticket?.from);
  const toCode = getCityCode(ticket?.to);
  return `DRV-${fromCode}-${toCode}-${compactDate(ticket?.date)}-${compactTime(ticket?.departureTime)}`;
}

export function buildPublicTripCode(ticket) {
  if (ticket?.publicTripCode) return ticket.publicTripCode;
  const fromCode = getCityCode(ticket?.from);
  const toCode = getCityCode(ticket?.to);
  return `TRQ-${fromCode}-${toCode}-${compactDate(ticket?.date)}-${compactTime(ticket?.departureTime)}-${buildStableSuffix(ticket)}`;
}
