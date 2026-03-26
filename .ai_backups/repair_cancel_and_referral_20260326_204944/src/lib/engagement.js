import { supabase } from './supabase';
import { createLogger, normalizeSupabaseError } from './logger';

const log = createLogger('engagement');

const PENDING_REFERRAL_KEY = 'taree2y-pending-referral-code';

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function getLocationHref() {
  if (typeof window === 'undefined') return '';
  return String(window.location.href || '');
}

export function getReferralCodeFromUrl() {
  if (typeof window === 'undefined') return '';
  try {
    const url = new URL(getLocationHref());
    return normalizeCode(url.searchParams.get('ref'));
  } catch {
    return '';
  }
}

export function stashPendingReferralCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PENDING_REFERRAL_KEY, normalized);
  } catch {}
}

export function readPendingReferralCode() {
  if (typeof window === 'undefined') return '';
  try {
    return normalizeCode(window.sessionStorage.getItem(PENDING_REFERRAL_KEY));
  } catch {
    return '';
  }
}

export function clearPendingReferralCode() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PENDING_REFERRAL_KEY);
  } catch {}
}

export function buildReferralShareUrl(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return '';
  if (typeof window === 'undefined') return `/?ref=${encodeURIComponent(normalized)}`;
  try {
    const url = new URL(window.location.origin);
    url.pathname = '/';
    url.searchParams.set('ref', normalized);
    return url.toString();
  } catch {
    return `/?ref=${encodeURIComponent(normalized)}`;
  }
}

async function callJsonRpc(name, params) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) {
    log.warn('rpc_failed', { name, params, error });
    return { ok: false, error: normalizeSupabaseError(error), data: null };
  }
  return { ok: true, data, error: null };
}

async function ensureReferralCodeDirect(userId) {
  const result = await callJsonRpc('ensure_referral_code', { p_user_id: userId });
  if (!result.ok) return '';
  return normalizeCode(result.data);
}

function normalizeReferralSummary(raw, ensuredCode = '') {
  const safe = raw && typeof raw === 'object' ? raw : {};
  return {
    code: normalizeCode(safe.code || ensuredCode),
    appliedCode: normalizeCode(safe.appliedCode),
    referredByUserId: safe.referredByUserId || null,
    canApplyCode: Boolean(safe.canApplyCode ?? !safe.appliedCode),
    totalInvites: Number(safe.totalInvites || 0),
    pendingInvites: Number(safe.pendingInvites || 0),
    qualifiedInvites: Number(safe.qualifiedInvites || 0),
    rewardedInvites: Number(safe.rewardedInvites || 0),
    latestStatus: String(safe.latestStatus || ''),
    message: String(safe.message || ''),
  };
}

export async function getReferralSummary({ userId }) {
  if (!userId) return null;

  const summaryResult = await callJsonRpc('get_referral_summary', { p_user_id: userId });

  if (summaryResult.ok && summaryResult.data) {
    const normalized = normalizeReferralSummary(summaryResult.data);
    if (normalized.code) return normalized;
  }

  const ensuredCode = await ensureReferralCodeDirect(userId);

  if (summaryResult.ok && summaryResult.data) {
    return normalizeReferralSummary(summaryResult.data, ensuredCode);
  }

  if (ensuredCode) {
    return normalizeReferralSummary(
      {
        code: ensuredCode,
        canApplyCode: true,
        totalInvites: 0,
        pendingInvites: 0,
        qualifiedInvites: 0,
        rewardedInvites: 0,
        latestStatus: '',
        message: 'تم تجهيز كود الدعوة.',
      },
      ensuredCode,
    );
  }

  return {
    code: '',
    appliedCode: '',
    referredByUserId: null,
    canApplyCode: true,
    totalInvites: 0,
    pendingInvites: 0,
    qualifiedInvites: 0,
    rewardedInvites: 0,
    latestStatus: '',
    message: 'تعذر تحميل بيانات الدعوات حالياً.',
  };
}

export async function applyReferralCode({ userId, code }) {
  const normalized = normalizeCode(code);
  if (!userId) {
    return { ok: false, code: 'missing_user', message: 'لازم تسجل دخول الأول.' };
  }
  if (!normalized) {
    return { ok: false, code: 'referral_empty', message: 'اكتب كود الدعوة أولاً.' };
  }

  const result = await callJsonRpc('apply_referral_code', {
    p_user_id: userId,
    p_code: normalized,
  });

  if (!result.ok) {
    return {
      ok: false,
      code: result.error?.code || 'rpc_error',
      message: result.error?.message || 'تعذر ربط كود الدعوة حالياً.',
    };
  }

  const payload = result.data && typeof result.data === 'object' ? result.data : {};
  const ok = Boolean(payload.ok);
  if (ok) clearPendingReferralCode();

  return {
    ok,
    code: String(payload.code || ''),
    message: String(payload.message || (ok ? 'تم ربط الحساب بكود الدعوة.' : 'تعذر ربط كود الدعوة.')),
    data: payload,
  };
}

export async function recordCampaignEvent({
  userId,
  campaignId = null,
  eventName = '',
  source = 'app',
  metadata = {},
}) {
  if (!userId || !eventName) return null;

  const result = await callJsonRpc('record_campaign_event', {
    p_user_id: userId,
    p_campaign_id: campaignId,
    p_event_name: eventName,
    p_event_source: source,
    p_metadata: metadata || {},
  });

  return result.ok ? result.data : null;
}

export async function syncUserEngagement({ userId, context = {} }) {
  if (!userId) return null;
  const result = await callJsonRpc('sync_user_engagement', {
    p_user_id: userId,
    p_context: context || {},
  });
  return result.ok ? result.data : null;
}
