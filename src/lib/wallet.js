const shortDateFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'short',
});

const dateTimeFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

function normalizeText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function toFiniteAmount(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.abs(numeric) : 0;
}

function toIsoTimestamp(value) {
  if (!value) return '';

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  const raw = String(value).trim();
  if (!raw) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsedDateOnly = new Date(`${raw}T12:00:00`);
    return Number.isNaN(parsedDateOnly.getTime())
      ? ''
      : parsedDateOnly.toISOString();
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function toDateOnly(value) {
  const iso = toIsoTimestamp(value) || new Date().toISOString();
  return iso.slice(0, 10);
}

function detectType(entry) {
  const raw = String(entry?.type || entry?.kind || entry?.direction || '')
    .trim()
    .toLowerCase();

  return ['debit', 'withdraw', 'deduction', 'expense', 'payment', 'charge'].includes(raw)
    ? 'debit'
    : 'credit';
}

export function normalizeWalletTransaction(entry) {
  const label =
    normalizeText(entry?.description) ||
    normalizeText(entry?.desc) ||
    normalizeText(entry?.title) ||
    'حركة على المحفظة';

  const createdAt =
    toIsoTimestamp(
      entry?.created_at ||
        entry?.occurred_at ||
        entry?.transaction_date ||
        entry?.inserted_at ||
        entry?.updated_at ||
        entry?.date,
    ) || new Date().toISOString();

  const safeDate =
    normalizeText(entry?.date) && /^\d{4}-\d{2}-\d{2}$/.test(String(entry.date))
      ? String(entry.date)
      : toDateOnly(createdAt);

  const amount = toFiniteAmount(entry?.amount);
  const type = detectType(entry);

  return {
    ...entry,
    id:
      entry?.id ||
      entry?.reference_id ||
      entry?.request_id ||
      `${type}-${safeDate}-${Math.round(amount * 100)}`,
    amount,
    type,
    date: safeDate,
    created_at: createdAt,
    desc: label,
    description: label,
  };
}

export function createWalletTransaction(input) {
  return normalizeWalletTransaction({
    ...input,
    created_at: input?.created_at || new Date().toISOString(),
  });
}

export function sortWalletTransactions(entries = []) {
  return [...entries]
    .map(normalizeWalletTransaction)
    .sort((left, right) => {
      const leftTime = new Date(left.created_at).getTime();
      const rightTime = new Date(right.created_at).getTime();
      const timeDiff = rightTime - leftTime;

      if (timeDiff !== 0) return timeDiff;
      return String(right.id).localeCompare(String(left.id));
    });
}

export function getWalletTransactionLabel(entry) {
  return normalizeWalletTransaction(entry).description;
}

export function formatWalletTransactionDate(entry) {
  const normalized = normalizeWalletTransaction(entry);

  const rawTimestamp = String(
    entry?.created_at ||
      entry?.occurred_at ||
      entry?.transaction_date ||
      entry?.inserted_at ||
      '',
  ).trim();

  const parsed = new Date(rawTimestamp || normalized.date);
  if (Number.isNaN(parsed.getTime())) {
    return normalized.date || '';
  }

  const hasTime =
    rawTimestamp.includes('T') || /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(rawTimestamp);

  return hasTime
    ? dateTimeFormatter.format(parsed)
    : shortDateFormatter.format(parsed);
}
