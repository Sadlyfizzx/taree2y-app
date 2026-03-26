import { supabase } from './supabase';
import {
  createLogger,
  isMissingRpcError,
  normalizeSupabaseError,
} from './logger';

const log = createLogger('engagement');

const REFERRAL_PENDING_KEY = 'taree2y_pending_referral_code';
const DISABLED_ENGAGEMENT_RPCS_KEY = 'taree2y_disabled_engagement_rpcs';

function readDisabledEngagementRpcs() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.sessionStorage.getItem(DISABLED_ENGAGEMENT_RPCS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const disabledEngagementRpcs = new Set(readDisabledEngagementRpcs());

function persistDisabledEngagementRpcs() {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      DISABLED_ENGAGEMENT_RPCS_KEY,
      JSON.stringify(Array.from(disabledEngagementRpcs)),
    );
  } catch {
    // ignore storage errors
  }
}

function markEngagementRpcUnavailable(rpcName) {
  const safeName = normalizeText(rpcName);
  if (!safeName) return;
  disabledEngagementRpcs.add(safeName);
  persistDisabledEngagementRpcs();
}

function isEngagementRpcDisabled(rpcName) {
  return disabledEngagementRpcs.has(normalizeText(rpcName));
}

function getNormalizedErrorText(error) {
  const normalized = normalizeSupabaseError(error);
  return JSON.stringify({
    name: normalized.name,
    code: normalized.code,
    status: normalized.status,
    message: normalized.message,
    details: normalized.details,
    hint: normalized.hint,
  }).toLowerCase();
}

function isMissingOrUnavailableRpc(error, rpcName = '') {
  if (isMissingRpcError(error, rpcName)) return true;

  const text = getNormalizedErrorText(error);
  const expected = normalizeText(rpcName).toLowerCase();

  return (
    text.includes('pgrst202') ||
    text.includes('42883') ||
    text.includes('404') ||
    text.includes('could not find the function') ||
    text.includes('function does not exist') ||
    text.includes('schema cache') ||
    (expected && text.includes(expected) && text.includes('not found')) ||
    (expected && text.includes(expected) && text.includes('does not exist'))
  );
}

function maybeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeUpperText(value) {
  return normalizeText(value).toUpperCase();
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toNullableNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toIsoOrNull(value) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeNotification(row) {
  const source = maybeObject(row);
  const payload = maybeObject(source.payload);

  return {
    id: source.id || payload.id || `notification-${Date.now()}`,
    eventKey:
      normalizeText(payload.eventKey || payload.event_key || source.dedupe_key || source.id) ||
      `notification-${Date.now()}`,
    title: normalizeText(source.title || payload.title || 'تنبيه جديد'),
    body: normalizeText(source.body || payload.body || ''),
    tripCode: normalizeText(source.trip_code || payload.tripCode || payload.trip_code || ''),
    routeLabel: normalizeText(source.route_label || payload.routeLabel || payload.route_label || ''),
    timeLabel: normalizeText(source.time_label || payload.timeLabel || payload.time_label || ''),
    createdAt:
      source.created_at ||
      source.delivered_at ||
      payload.createdAt ||
      payload.created_at ||
      new Date().toISOString(),
    deliveredAt:
      source.delivered_at ||
      source.created_at ||
      payload.deliveredAt ||
      payload.delivered_at ||
      null,
    readAt:
      source.read_at || payload.readAt || payload.read_at || null,
    dismissedAt:
      source.dismissed_at || payload.dismissedAt || payload.dismissed_at || null,
    expiresAt:
      source.expires_at || payload.expiresAt || payload.expires_at || null,
    campaignId:
      source.campaign_id || payload.campaignId || payload.campaign_id || null,
    priority: toNumber(source.priority ?? payload.priority, 0),
    category: normalizeText(source.category || payload.category || 'generic') || 'generic',
    source: normalizeText(source.source || payload.source || 'server') || 'server',
    ctaLabel: normalizeText(source.cta_label || payload.ctaLabel || payload.cta_label || ''),
    ctaAction: normalizeText(source.cta_action || payload.ctaAction || payload.cta_action || ''),
    payload,
  };
}

function normalizeOffer(raw) {
  const source = maybeObject(raw);
  const routeParams = maybeObject(source.routeParams || source.route_params);

  return {
    campaignId: source.campaignId || source.campaign_id || null,
    code: normalizeUpperText(source.code),
    title: normalizeText(source.title || 'عرض مخصص'),
    description: normalizeText(source.description || ''),
    message: normalizeText(source.message || source.description || ''),
    popupEnabled: Boolean(source.popupEnabled ?? source.popup_enabled ?? false),
    highlightEnabled: Boolean(source.highlightEnabled ?? source.highlight_enabled ?? true),
    endsAt: toIsoOrNull(source.endsAt || source.ends_at),
    startsAt: toIsoOrNull(source.startsAt || source.starts_at),
    triggerKind: normalizeText(source.triggerKind || source.trigger_kind || 'targeted') || 'targeted',
    ctaLabel: normalizeText(source.ctaLabel || source.cta_label || ''),
    ctaAction: normalizeText(source.ctaAction || source.cta_action || ''),
    routeParams: Object.keys(routeParams).length ? routeParams : null,
  };
}

function normalizeReferralSummary(raw) {
  const source = maybeObject(raw);
  const code = normalizeUpperText(source.code || source.referral_code || source.referralCode);
  const appliedCode = normalizeUpperText(
    source.appliedCode || source.applied_code || source.referred_by_code,
  );

  return {
    code,
    link: buildReferralShareUrl(code),
    appliedCode,
    referredByUserId:
      source.referredByUserId || source.referred_by_user_id || null,
    canApplyCode: Boolean(source.canApplyCode ?? source.can_apply_code ?? !appliedCode),
    totalInvites: toNumber(source.totalInvites ?? source.total_invites, 0),
    pendingInvites: toNumber(source.pendingInvites ?? source.pending_invites, 0),
    qualifiedInvites: toNumber(source.qualifiedInvites ?? source.qualified_invites, 0),
    rewardedInvites: toNumber(source.rewardedInvites ?? source.rewarded_invites, 0),
    latestStatus: normalizeText(source.latestStatus || source.latest_status || ''),
    message: normalizeText(source.message || ''),
  };
}

function normalizeRpcResult(raw, fallbackMessage = '') {
  const source = maybeObject(raw);
  const ok = Boolean(source.ok ?? source.success ?? false);
  return {
    ok,
    code: normalizeText(source.code || source.result_code || (ok ? 'ok' : 'error')) || (ok ? 'ok' : 'error'),
    message: normalizeText(source.message || fallbackMessage),
    data: maybeObject(source.data),
  };
}

export function buildReferralShareUrl(code) {
  const safeCode = normalizeUpperText(code);
  if (!safeCode) return '';

  const origin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  const path = `/?ref=${encodeURIComponent(safeCode)}`;
  return origin ? `${origin}${path}` : path;
}

export function getReferralCodeFromUrl() {
  if (typeof window === 'undefined') return '';

  try {
    const params = new URLSearchParams(window.location.search);
    return normalizeUpperText(params.get('ref'));
  } catch {
    return '';
  }
}

export function stashPendingReferralCode(code) {
  const safeCode = normalizeUpperText(code);
  if (!safeCode) return '';

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(REFERRAL_PENDING_KEY, safeCode);
    } catch {
      // ignore storage errors and still return the normalized code
    }
  }

  return safeCode;
}

export function readPendingReferralCode() {
  if (typeof window === 'undefined') return '';

  try {
    return normalizeUpperText(window.sessionStorage.getItem(REFERRAL_PENDING_KEY));
  } catch {
    return '';
  }
}

export function clearPendingReferralCode() {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(REFERRAL_PENDING_KEY);
  } catch {
    // ignore storage errors
  }
}

export async function syncUserEngagement({ userId, context = {} }) {
  if (!userId) {
    return { ok: false, code: 'auth_required', message: 'user_id missing', data: {} };
  }

  if (isEngagementRpcDisabled('sync_user_engagement')) {
    return {
      ok: false,
      code: 'sync_unavailable',
      message: 'تعذر مزامنة طبقة التفاعل حالياً.',
      data: {},
    };
  }

  try {
    const { data, error } = await supabase.rpc('sync_user_engagement', {
      p_user_id: userId,
      p_context: context,
    });

    if (error) throw error;

    return normalizeRpcResult(data, 'تمت مزامنة طبقة التفاعل.');
  } catch (error) {
    if (isMissingOrUnavailableRpc(error, 'sync_user_engagement')) {
      markEngagementRpcUnavailable('sync_user_engagement');
      return {
        ok: false,
        code: 'sync_unavailable',
        message: 'تعذر مزامنة طبقة التفاعل حالياً.',
        data: {},
      };
    }

    log.warn('sync_user_engagement_failed', {
      userId,
      error: normalizeSupabaseError(error),
    });

    return {
      ok: false,
      code: 'sync_unavailable',
      message: 'تعذر مزامنة طبقة التفاعل حالياً.',
      data: {},
    };
  }
}

export async function listUserNotifications({ userId, limit = 50 }) {
  if (!userId) return [];

  try {
    const { data, error } = await supabase.rpc('list_user_notifications', {
      p_user_id: userId,
      p_limit: limit,
    });

    if (error) throw error;

    return Array.isArray(data) ? data.map(normalizeNotification) : [];
  } catch (error) {
    if (!isMissingRpcError(error, 'list_user_notifications')) {
      log.warn('list_user_notifications_failed', {
        userId,
        error: normalizeSupabaseError(error),
      });
    }

    return [];
  }
}

export async function markUserNotificationsRead({ userId, ids = null }) {
  if (!userId) return 0;

  try {
    const { data, error } = await supabase.rpc('mark_user_notifications_read', {
      p_user_id: userId,
      p_ids: Array.isArray(ids) && ids.length ? ids : null,
    });

    if (error) throw error;
    return toNumber(data, 0);
  } catch (error) {
    if (!isMissingRpcError(error, 'mark_user_notifications_read')) {
      log.warn('mark_user_notifications_read_failed', {
        userId,
        error: normalizeSupabaseError(error),
      });
    }

    return 0;
  }
}

export async function dismissUserNotifications({ userId, ids = null }) {
  if (!userId) return 0;

  try {
    const { data, error } = await supabase.rpc('dismiss_user_notifications', {
      p_user_id: userId,
      p_ids: Array.isArray(ids) && ids.length ? ids : null,
    });

    if (error) throw error;
    return toNumber(data, 0);
  } catch (error) {
    if (!isMissingRpcError(error, 'dismiss_user_notifications')) {
      log.warn('dismiss_user_notifications_failed', {
        userId,
        error: normalizeSupabaseError(error),
      });
    }

    return 0;
  }
}

export async function deliverUserNotification({ userId, notification }) {
  if (!userId || !notification) return null;

  try {
    const { data, error } = await supabase.rpc('deliver_user_notification', {
      p_user_id: userId,
      p_payload: notification,
    });

    if (error) throw error;
    return data ? normalizeNotification(data) : null;
  } catch (error) {
    if (!isMissingRpcError(error, 'deliver_user_notification')) {
      log.warn('deliver_user_notification_failed', {
        userId,
        error: normalizeSupabaseError(error),
      });
    }

    return null;
  }
}

export async function recordCampaignEvent({
  userId,
  campaignId = null,
  eventName,
  source = 'app',
  metadata = {},
}) {
  if (!userId || !eventName) return null;

  try {
    const { data, error } = await supabase.rpc('record_campaign_event', {
      p_user_id: userId,
      p_campaign_id: campaignId,
      p_event_name: eventName,
      p_event_source: source,
      p_metadata: metadata,
    });

    if (error) throw error;
    return data || null;
  } catch (error) {
    if (!isMissingRpcError(error, 'record_campaign_event')) {
      log.warn('record_campaign_event_failed', {
        userId,
        campaignId,
        eventName,
        error: normalizeSupabaseError(error),
      });
    }

    return null;
  }
}

export async function getTargetedPromoOffer({ userId, context = {} }) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase.rpc('get_targeted_promo_offer', {
      p_user_id: userId,
      p_context: context,
    });

    if (error) throw error;
    return data ? normalizeOffer(data) : null;
  } catch (error) {
    if (!isMissingRpcError(error, 'get_targeted_promo_offer')) {
      log.warn('get_targeted_promo_offer_failed', {
        userId,
        error: normalizeSupabaseError(error),
      });
    }

    return null;
  }
}

async function ensureReferralCodeDirect(userId) {
  if (!userId || isEngagementRpcDisabled('ensure_referral_code')) {
    return '';
  }

  try {
    const { data, error } = await supabase.rpc('ensure_referral_code', {
      p_user_id: userId,
    });

    if (error) throw error;
    return normalizeUpperText(data);
  } catch (error) {
    if (isMissingOrUnavailableRpc(error, 'ensure_referral_code')) {
      markEngagementRpcUnavailable('ensure_referral_code');
      return '';
    }

    log.warn('ensure_referral_code_failed', {
      userId,
      error: normalizeSupabaseError(error),
    });

    return '';
  }
}

export async function getReferralSummary({ userId }) {
  if (!userId) return null;

  let summary = null;

  if (!isEngagementRpcDisabled('get_referral_summary')) {
    try {
      const { data, error } = await supabase.rpc('get_referral_summary', {
        p_user_id: userId,
      });

      if (error) throw error;
      summary = normalizeReferralSummary(data || {});
    } catch (error) {
      if (isMissingOrUnavailableRpc(error, 'get_referral_summary')) {
        markEngagementRpcUnavailable('get_referral_summary');
      } else {
        log.warn('get_referral_summary_failed', {
          userId,
          error: normalizeSupabaseError(error),
        });
      }
    }
  }

  if (summary?.code) {
    return summary;
  }

  const ensuredCode = await ensureReferralCodeDirect(userId);

  if (!summary && !ensuredCode) {
    return null;
  }

  return normalizeReferralSummary({
    ...(summary || {}),
    code: summary?.code || ensuredCode,
  });
}

export async function applyReferralCode({ userId, code }) {
  if (!userId) {
    return {
      ok: false,
      code: 'auth_required',
      message: 'سجّل الدخول أولاً لاستخدام كود الدعوة.',
      data: {},
    };
  }

  const safeCode = normalizeUpperText(code);
  if (!safeCode) {
    return {
      ok: false,
      code: 'referral_empty',
      message: 'اكتب كود الدعوة أولاً.',
      data: {},
    };
  }

  try {
    const { data, error } = await supabase.rpc('apply_referral_code', {
      p_user_id: userId,
      p_code: safeCode,
    });

    if (error) throw error;
    const result = normalizeRpcResult(data, 'تم ربط الحساب بكود الدعوة.');
    if (result?.ok) clearPendingReferralCode();
    return result;
  } catch (error) {
    if (!isMissingRpcError(error, 'apply_referral_code')) {
      log.warn('apply_referral_code_failed', {
        userId,
        code: safeCode,
        error: normalizeSupabaseError(error),
      });
    }

    return {
      ok: false,
      code: 'referral_unavailable',
      message: 'تعذر استخدام كود الدعوة حالياً.',
      data: {},
    };
  }
}

export function createRetentionSummary(syncResult) {
  const result = maybeObject(syncResult);
  const data = maybeObject(result.data);
  const inactiveDays = toNullableNumber(data.inactive_days ?? data.inactiveDays);
  const seededNotifications = toNumber(data.seeded_notifications ?? data.seededNotifications, 0);
  const reactivationCampaignId = data.reactivation_campaign_id || data.reactivationCampaignId || null;

  return {
    inactiveDays,
    seededNotifications,
    reactivationCampaignId,
    shouldShow: Boolean(reactivationCampaignId || seededNotifications || (inactiveDays && inactiveDays >= 7)),
    message: normalizeText(data.message || result.message || ''),
  };
}
