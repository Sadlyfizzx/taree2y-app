const numberFormatter = new Intl.NumberFormat('ar-EG');
const dateFormatter = new Intl.DateTimeFormat('ar-EG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const shortDateFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const dateTimeFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const ARABIC_DIGITS = {
  0: '٠',
  1: '١',
  2: '٢',
  3: '٣',
  4: '٤',
  5: '٥',
  6: '٦',
  7: '٧',
  8: '٨',
  9: '٩',
};

export function localizeDigits(value = '') {
  return String(value).replace(/\d/g, (digit) => ARABIC_DIGITS[digit] || digit);
}

export function formatNumber(value, options = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return localizeDigits(String(value ?? ''));
  }
  return new Intl.NumberFormat('ar-EG', options).format(numeric);
}

export function formatInteger(value) {
  return formatNumber(Math.round(Number(value || 0)));
}

export function formatCountText(value, singular, plural = singular) {
  const count = Math.max(0, Number(value || 0));
  return `${formatInteger(count)} ${count === 1 ? singular : plural}`;
}

export function formatPercent(value, { scale = 1, maximumFractionDigits = 0 } = {}) {
  const numeric = Number(value || 0) * scale;
  return `${formatNumber(numeric, {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  })}%`;
}

export function formatCurrency(value) {
  const numeric = Number(value || 0);
  return `${numberFormatter.format(numeric)} ج.م`;
}

export function formatDuration(durationHour) {
  const totalMinutes = Math.max(0, Math.round(Number(durationHour || 0) * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${formatInteger(minutes)} د`;
  if (!minutes) return `${formatInteger(hours)} س`;
  return `${formatInteger(hours)} س ${formatInteger(minutes)} د`;
}

export function formatDateText(dateValue) {
  if (!dateValue) return '';

  try {
    return dateFormatter.format(new Date(`${dateValue}T12:00:00`));
  } catch {
    return localizeDigits(String(dateValue));
  }
}

export function formatShortDateText(dateValue) {
  if (!dateValue) return '';

  try {
    return shortDateFormatter.format(new Date(`${dateValue}T12:00:00`));
  } catch {
    return localizeDigits(String(dateValue));
  }
}

export function formatDateTimeText(value) {
  if (!value) return '';

  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return localizeDigits(String(value));
    }
    return dateTimeFormatter.format(parsed);
  } catch {
    return localizeDigits(String(value));
  }
}

// intentionally keeps seat codes like 12A / 4B as identifiers
export function formatSeatsText(seats = []) {
  const safeSeats = Array.isArray(seats) ? seats.filter(Boolean) : [];
  return safeSeats.length ? safeSeats.join('، ') : '—';
}

export function formatTimeText(timeValue) {
  const safe = String(timeValue || '').trim();
  if (!safe) return '';
  return localizeDigits(safe);
}

export function formatHoldCountdown(remainingMs) {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return 'انتهت مهلة تثبيت المقاعد';
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `المقاعد متثبتة ${formatInteger(minutes)}:${localizeDigits(String(seconds).padStart(2, '0'))}`;
}
