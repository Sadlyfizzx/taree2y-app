const numberFormatter = new Intl.NumberFormat('ar-EG');
const dateFormatter = new Intl.DateTimeFormat('ar-EG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function formatCurrency(value) {
  const numeric = Number(value || 0);
  return `${numberFormatter.format(numeric)} ج.م`;
}

export function formatDuration(durationHour) {
  const totalMinutes = Math.max(0, Math.round(Number(durationHour || 0) * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${numberFormatter.format(minutes)} د`;
  if (!minutes) return `${numberFormatter.format(hours)} س`;
  return `${numberFormatter.format(hours)} س ${numberFormatter.format(minutes)} د`;
}

export function formatDateText(dateValue) {
  if (!dateValue) return '';

  try {
    return dateFormatter.format(new Date(`${dateValue}T12:00:00`));
  } catch {
    return String(dateValue);
  }
}

export function formatSeatsText(seats = []) {
  const safeSeats = Array.isArray(seats) ? seats.filter(Boolean) : [];
  return safeSeats.length ? safeSeats.join('، ') : '—';
}

export function formatHoldCountdown(remainingMs) {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return 'انتهت مهلة تثبيت المقاعد';
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `المقاعد متثبتة ${numberFormatter.format(minutes)}:${String(seconds).padStart(2, '0')}`;
}
