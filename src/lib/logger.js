const SENSITIVE_KEY_PATTERN =
  /(token|key|secret|password|authorization|cookie|jwt|session|refresh|access)/i;

const LEVEL_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const getActiveLevel = () => {
  const debugEnabled =
    Boolean(import.meta.env?.DEV) ||
    String(import.meta.env?.VITE_APP_DEBUG || '').toLowerCase() === 'true';
  return debugEnabled ? LEVEL_PRIORITY.debug : LEVEL_PRIORITY.info;
};

const toNumberOrNull = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export function serializeError(error) {
  if (!error) return null;

  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    code: error.code || error.error_code || null,
    status:
      toNumberOrNull(error.status) ??
      toNumberOrNull(error.httpStatus) ??
      toNumberOrNull(error?.error?.status),
    details:
      typeof error.details === 'string'
        ? error.details
        : typeof error?.error?.details === 'string'
        ? error.error.details
        : null,
    hint:
      typeof error.hint === 'string'
        ? error.hint
        : typeof error?.error?.hint === 'string'
        ? error.error.hint
        : null,
  };
}

export function normalizeSupabaseError(error) {
  const serialized = serializeError(error);
  if (!serialized) {
    return {
      name: 'Error',
      message: 'Unknown error',
      code: null,
      status: null,
      details: null,
      hint: null,
    };
  }

  return serialized;
}

function normalizeValue(value, depth = 0) {
  if (value == null) return value;
  if (value instanceof Error) return serializeError(value);
  if (depth > 2) return '[truncated]';

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => normalizeValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    const normalized = {};
    for (const [key, entry] of Object.entries(value).slice(0, 24)) {
      normalized[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? '[redacted]'
        : normalizeValue(entry, depth + 1);
    }
    return normalized;
  }

  if (typeof value === 'string' && value.length > 240) {
    return `${value.slice(0, 237)}...`;
  }

  return value;
}

function getErrorPayload(candidate) {
  const normalized = normalizeSupabaseError(candidate);
  const payload = JSON.stringify({
    code: normalized.code,
    status: normalized.status,
    message: normalized.message,
    details: normalized.details,
    hint: normalized.hint,
  }).toLowerCase();

  return { normalized, payload };
}

function emit(level, moduleName, event, context) {
  if (LEVEL_PRIORITY[level] < getActiveLevel()) return;

  const consoleMethod =
    level === 'debug'
      ? 'debug'
      : level === 'info'
      ? 'info'
      : level === 'warn'
      ? 'warn'
      : 'error';

  if (context === undefined) {
    console[consoleMethod](`[taree2y][${level}][${moduleName}]`, event);
    return;
  }

  console[consoleMethod](
    `[taree2y][${level}][${moduleName}]`,
    event,
    normalizeValue(context),
  );
}

export function isNetworkError(candidate) {
  const { normalized, payload } = getErrorPayload(candidate);

  return (
    normalized.status === 0 ||
    payload.includes('failed to fetch') ||
    payload.includes('networkerror') ||
    payload.includes('network request failed') ||
    payload.includes('load failed')
  );
}

export function isRateLimitError(candidate) {
  const { normalized, payload } = getErrorPayload(candidate);
  return (
    normalized.status === 429 ||
    payload.includes('rate limit') ||
    payload.includes('too many requests')
  );
}

export function isRlsError(candidate) {
  const { payload } = getErrorPayload(candidate);

  return (
    payload.includes('row-level security') ||
    payload.includes('violates row-level security policy') ||
    payload.includes('permission denied for table') ||
    payload.includes('permission denied')
  );
}

export function isMissingRpcError(candidate, expectedFunctionName = '') {
  const { payload } = getErrorPayload(candidate);
  const expected = String(expectedFunctionName || '').trim().toLowerCase();
  const matchesExpectedFunction = expected ? payload.includes(expected) : true;

  return (
    payload.includes('pgrst202') ||
    payload.includes('could not find the function') ||
    payload.includes('schema cache') ||
    (payload.includes('function') &&
      payload.includes('not found') &&
      matchesExpectedFunction)
  );
}

export function classifyRpcError(candidate, expectedFunctionName = '') {
  if (!candidate) return 'unknown';
  if (candidate?.errorClass) return candidate.errorClass;
  if (isMissingRpcError(candidate, expectedFunctionName)) return 'missing_rpc';
  return 'rpc_error';
}

export function debug(moduleName, event, context) {
  emit('debug', moduleName, event, context);
}

export function info(moduleName, event, context) {
  emit('info', moduleName, event, context);
}

export function warn(moduleName, event, context) {
  emit('warn', moduleName, event, context);
}

export function error(moduleName, event, context) {
  emit('error', moduleName, event, context);
}

export function createLogger(moduleName) {
  return {
    debug(event, context) {
      debug(moduleName, event, context);
    },
    info(event, context) {
      info(moduleName, event, context);
    },
    warn(event, context) {
      warn(moduleName, event, context);
    },
    error(event, context) {
      error(moduleName, event, context);
    },
  };
}
