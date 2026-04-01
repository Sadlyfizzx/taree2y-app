import { supabase } from './supabase';
import { getTargetedPromoOffer } from './engagement';
import {
  createLogger,
  isMissingRpcError,
  normalizeSupabaseError,
} from './logger';

const log = createLogger('promo-engine');

export const PROMO_RESULT_CODES = Object.freeze({
  EMPTY: 'promo_empty',
  VALID: 'promo_valid',
  NOT_FOUND: 'promo_not_found',
  INACTIVE: 'promo_inactive',
  NOT_STARTED: 'promo_not_started',
  EXPIRED: 'promo_expired',
  USED: 'promo_used',
  USER_LIMIT_REACHED: 'promo_user_limit_reached',
  FIRST_TRIP_ONLY: 'promo_first_trip_only',
  MIN_AMOUNT: 'promo_min_amount',
  ROUTE_NOT_ELIGIBLE: 'promo_route_not_eligible',
  USAGE_FINISHED: 'promo_usage_finished',
  BOOKING_NOT_SUPPORTED: 'promo_booking_not_supported',
  UNAVAILABLE: 'promo_unavailable',
  INVALID: 'promo_invalid',
  UNKNOWN: 'promo_unknown',
});

function maybeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizePromoCode(value) {
  return String(value || '').trim().toUpperCase();
}

function toNumberOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function toNullableNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeDiscountType(value) {
  const raw = String(value || '').trim().toLowerCase();

  if (['percent', 'percentage', 'pct'].includes(raw)) {
    return 'percent';
  }

  if (['fixed', 'amount', 'flat'].includes(raw)) {
    return 'fixed';
  }

  return '';
}

function normalizeRouteParams(value) {
  const safe = maybeObject(value);
  return Object.keys(safe).length ? safe : null;
}

export function createEmptyPromoResult() {
  return {
    ok: true,
    code: PROMO_RESULT_CODES.EMPTY,
    message: '',
    data: {
      applied: false,
      promoCode: '',
      campaignId: null,
      title: '',
      description: '',
      discountType: '',
      discountValue: 0,
      discountAmount: 0,
      maxDiscount: null,
      minimumBookingAmount: 0,
      startsAt: null,
      endsAt: null,
      firstTripOnly: false,
      perUserLimit: null,
      globalLimit: null,
      remainingGlobalUses: null,
      routeRestriction: null,
      unavailable: false,
      popupEnabled: false,
      highlightEnabled: true,
      requiresServerBooking: false,
      routeParams: null,
      source: 'none',
    },
  };
}

function buildPromoMessage(resultCode, promoCode = '') {
  switch (resultCode) {
    case PROMO_RESULT_CODES.EMPTY:
      return '';
    case PROMO_RESULT_CODES.VALID:
      return promoCode
        ? `تم تفعيل الكود ${promoCode} بنجاح.`
        : 'تم تفعيل كود الخصم بنجاح.';
    case PROMO_RESULT_CODES.NOT_FOUND:
      return 'كود الخصم غير موجود.';
    case PROMO_RESULT_CODES.INACTIVE:
      return 'الكود موجود لكن الحملة متوقفة حالياً.';
    case PROMO_RESULT_CODES.NOT_STARTED:
      return 'الكود موجود لكن الحملة لسه ما بدأتـش.';
    case PROMO_RESULT_CODES.EXPIRED:
      return 'مدة استخدام الكود انتهت.';
    case PROMO_RESULT_CODES.USED:
      return 'الكود اتستخدم قبل كده على حسابك.';
    case PROMO_RESULT_CODES.USER_LIMIT_REACHED:
      return 'وصلت للحد المسموح لاستخدام الكود ده.';
    case PROMO_RESULT_CODES.FIRST_TRIP_ONLY:
      return 'الكود ده متاح لأول رحلة ناجحة فقط.';
    case PROMO_RESULT_CODES.MIN_AMOUNT:
      return 'قيمة الحجز الحالية أقل من الحد الأدنى المطلوب للكود.';
    case PROMO_RESULT_CODES.ROUTE_NOT_ELIGIBLE:
      return 'الكود ده مش متاح على المسار الحالي.';
    case PROMO_RESULT_CODES.USAGE_FINISHED:
      return 'استخدامات الحملة خلصت حالياً.';
    case PROMO_RESULT_CODES.BOOKING_NOT_SUPPORTED:
      return 'الرحلة دي شغالة من نتائج احتياطية، فالكود الحقيقي مش بيتطبق عليها.';
    case PROMO_RESULT_CODES.UNAVAILABLE:
      return 'تعذر مراجعة كود الخصم حالياً.';
    default:
      return 'الكود غير متاح حالياً.';
  }
}

function inferPromoResultCode({ applied, unavailable, message, promoCode }) {
  if (applied) return PROMO_RESULT_CODES.VALID;
  if (unavailable) return PROMO_RESULT_CODES.UNAVAILABLE;

  const text = String(message || '').trim().toLowerCase();
  if (!promoCode && !text) return PROMO_RESULT_CODES.EMPTY;

  if (
    text.includes('not started') ||
    text.includes('لم يبدأ') ||
    text.includes('لسه')
  ) {
    return PROMO_RESULT_CODES.NOT_STARTED;
  }

  if (
    text.includes('expired') ||
    text.includes('منتهي') ||
    text.includes('انتهت') ||
    text.includes('انتهى')
  ) {
    return PROMO_RESULT_CODES.EXPIRED;
  }

  if (
    text.includes('inactive') ||
    text.includes('disabled') ||
    text.includes('غير مفعل') ||
    text.includes('متوقفة')
  ) {
    return PROMO_RESULT_CODES.INACTIVE;
  }

  if (
    text.includes('already used') ||
    text.includes('used before') ||
    text.includes('promo_used') ||
    text.includes('اتستخدم') ||
    text.includes('استخدمته') ||
    text.includes('مستخدم قبل')
  ) {
    return PROMO_RESULT_CODES.USED;
  }

  if (
    text.includes('first trip') ||
    text.includes('first booking') ||
    text.includes('أول رحلة') ||
    text.includes('اول رحلة')
  ) {
    return PROMO_RESULT_CODES.FIRST_TRIP_ONLY;
  }

  if (
    text.includes('minimum') ||
    text.includes('min booking') ||
    text.includes('الحد الأدنى') ||
    text.includes('الحد الادنى')
  ) {
    return PROMO_RESULT_CODES.MIN_AMOUNT;
  }

  if (
    text.includes('route') ||
    text.includes('المسار') ||
    text.includes('route_not_eligible')
  ) {
    return PROMO_RESULT_CODES.ROUTE_NOT_ELIGIBLE;
  }

  if (
    text.includes('global limit') ||
    text.includes('usage finished') ||
    text.includes('نفدت') ||
    text.includes('خلصت') ||
    text.includes('out of uses')
  ) {
    return PROMO_RESULT_CODES.USAGE_FINISHED;
  }

  if (
    text.includes('not found') ||
    text.includes('غير موجود') ||
    text.includes('invalid promo') ||
    text.includes('invalid code')
  ) {
    return PROMO_RESULT_CODES.NOT_FOUND;
  }

  return PROMO_RESULT_CODES.UNKNOWN;
}

function normalizePromoPreview(raw, fallbackPromoCode = '', source = 'preview_app_promo') {
  const outer = maybeObject(raw);
  const nested = maybeObject(outer.data);

  const legacyOuterCode = String(outer.code || '').startsWith('promo_')
    ? ''
    : outer.code;
  const nestedCode = String(nested.code || '').startsWith('promo_')
    ? ''
    : nested.code;

  const promoCode =
    normalizePromoCode(
      nested.promoCode ||
        nested.promo_code ||
        outer.promoCode ||
        outer.promo_code ||
        nestedCode ||
        legacyOuterCode ||
        fallbackPromoCode,
    ) || fallbackPromoCode;

  const outerResultCode =
    String(outer.resultCode || outer.result_code || '').trim() ||
    (String(outer.code || '').startsWith('promo_') ? String(outer.code || '').trim() : '');
  const nestedResultCode =
    String(nested.resultCode || nested.result_code || '').trim() ||
    (String(nested.code || '').startsWith('promo_') ? String(nested.code || '').trim() : '');

  const applied = Boolean(nested.applied ?? outer.applied);
  const unavailable = Boolean(nested.unavailable ?? outer.unavailable);
  const message = String(outer.message || nested.message || '').trim();
  const inferredCode = inferPromoResultCode({
    applied,
    unavailable,
    message,
    promoCode,
  });

  const resultCode =
    outerResultCode || nestedResultCode || inferredCode || PROMO_RESULT_CODES.UNKNOWN;

  const data = {
    applied: applied || resultCode === PROMO_RESULT_CODES.VALID,
    promoCode,
    campaignId:
      nested.campaignId ||
      nested.campaign_id ||
      outer.campaignId ||
      outer.campaign_id ||
      null,
    title: String(nested.title || outer.title || '').trim(),
    description: String(nested.description || outer.description || '').trim(),
    discountType: normalizeDiscountType(
      nested.discountType ||
        nested.discount_type ||
        outer.discountType ||
        outer.discount_type,
    ),
    discountValue: toNumberOrZero(
      nested.discountValue ??
        nested.discount_value ??
        outer.discountValue ??
        outer.discount_value,
    ),
    discountAmount: toNumberOrZero(
      nested.discountAmount ??
        nested.discount_amount ??
        outer.discountAmount ??
        outer.discount_amount,
    ),
    maxDiscount: toNullableNumber(
      nested.maxDiscount ??
        nested.max_discount ??
        outer.maxDiscount ??
        outer.max_discount,
    ),
    minimumBookingAmount: toNumberOrZero(
      nested.minimumBookingAmount ??
        nested.minimum_booking_amount ??
        outer.minimumBookingAmount ??
        outer.minimum_booking_amount ??
        nested.minBookingAmount ??
        nested.min_booking_amount ??
        outer.minBookingAmount ??
        outer.min_booking_amount,
    ),
    startsAt:
      nested.startsAt ||
      nested.starts_at ||
      outer.startsAt ||
      outer.starts_at ||
      null,
    endsAt:
      nested.endsAt ||
      nested.ends_at ||
      outer.endsAt ||
      outer.ends_at ||
      null,
    firstTripOnly: Boolean(
      nested.firstTripOnly ??
        nested.first_trip_only ??
        outer.firstTripOnly ??
        outer.first_trip_only,
    ),
    perUserLimit: toNullableNumber(
      nested.perUserLimit ??
        nested.per_user_limit ??
        outer.perUserLimit ??
        outer.per_user_limit,
    ),
    globalLimit: toNullableNumber(
      nested.globalLimit ??
        nested.global_limit ??
        outer.globalLimit ??
        outer.global_limit,
    ),
    remainingGlobalUses: toNullableNumber(
      nested.remainingGlobalUses ??
        nested.remaining_global_uses ??
        outer.remainingGlobalUses ??
        outer.remaining_global_uses,
    ),
    routeRestriction:
      nested.routeRestriction ||
      nested.route_restriction ||
      outer.routeRestriction ||
      outer.route_restriction ||
      null,
    unavailable,
    popupEnabled: Boolean(
      nested.popupEnabled ??
        nested.popup_enabled ??
        outer.popupEnabled ??
        outer.popup_enabled,
    ),
    highlightEnabled:
      nested.highlightEnabled !== undefined ||
      nested.highlight_enabled !== undefined ||
      outer.highlightEnabled !== undefined ||
      outer.highlight_enabled !== undefined
        ? Boolean(
            nested.highlightEnabled ??
              nested.highlight_enabled ??
              outer.highlightEnabled ??
              outer.highlight_enabled,
          )
        : true,
    requiresServerBooking: Boolean(
      nested.requiresServerBooking ??
        nested.requires_server_booking ??
        outer.requiresServerBooking ??
        outer.requires_server_booking,
    ),
    routeParams: normalizeRouteParams(
      nested.routeParams ||
        nested.route_params ||
        outer.routeParams ||
        outer.route_params,
    ),
    source,
  };

  const resolvedMessage = message || buildPromoMessage(resultCode, promoCode);

  return {
    ok:
      resultCode === PROMO_RESULT_CODES.EMPTY ||
      resultCode === PROMO_RESULT_CODES.VALID,
    code: resultCode,
    message: resolvedMessage,
    data,
  };
}

function buildUnavailableResult(promoCode, message) {
  const result = createEmptyPromoResult();

  return {
    ...result,
    ok: false,
    code: PROMO_RESULT_CODES.UNAVAILABLE,
    message: message || buildPromoMessage(PROMO_RESULT_CODES.UNAVAILABLE, promoCode),
    data: {
      ...result.data,
      promoCode: normalizePromoCode(promoCode),
      unavailable: true,
    },
  };
}

function normalizeOffer(data) {
  const safe = maybeObject(data);
  const code = normalizePromoCode(safe.code);

  return {
    campaignId: safe.campaignId || safe.campaign_id || null,
    code,
    title: String(safe.title || '').trim() || 'عرض خاص',
    description: String(safe.description || '').trim(),
    message: String(safe.message || '').trim(),
    startsAt: safe.startsAt || safe.starts_at || null,
    endsAt: safe.endsAt || safe.ends_at || null,
    discountType: normalizeDiscountType(safe.discountType || safe.discount_type),
    discountValue: toNumberOrZero(safe.discountValue ?? safe.discount_value),
    popupEnabled:
      safe.popupEnabled !== undefined || safe.popup_enabled !== undefined
        ? Boolean(safe.popupEnabled ?? safe.popup_enabled)
        : true,
    highlightEnabled:
      safe.highlightEnabled !== undefined || safe.highlight_enabled !== undefined
        ? Boolean(safe.highlightEnabled ?? safe.highlight_enabled)
        : true,
    routeParams: normalizeRouteParams(safe.routeParams || safe.route_params),
    cooldownHours: toNullableNumber(
      safe.popupCooldownHours ?? safe.popup_cooldown_hours,
    ),
    priority: toNullableNumber(safe.popupPriority ?? safe.popup_priority),
  };
}

export async function validatePromoCode({
  userId,
  code,
  bookingAmount,
  tripMeta = {},
  stage = 'preview',
}) {
  const normalizedCode = normalizePromoCode(code);

  if (!normalizedCode) {
    return createEmptyPromoResult();
  }

  const bookingAmountValue = toNumberOrZero(bookingAmount);

  try {
    const { data, error } = await supabase.rpc('preview_app_promo', {
      p_user_id: userId,
      p_code: normalizedCode,
      p_booking_amount: bookingAmountValue,
      p_trip_meta: tripMeta,
      p_stage: stage,
    });

    if (error) throw error;

    return normalizePromoPreview(data, normalizedCode, 'preview_app_promo');
  } catch (error) {
    if (!isMissingRpcError(error, 'preview_app_promo')) {
      const normalized = normalizeSupabaseError(error);
      log.error('promo_preview_failed', {
        userId,
        promoCode: normalizedCode,
        stage,
        error: normalized,
      });

      return buildUnavailableResult(
        normalizedCode,
        'تعذر مراجعة كود الخصم حالياً.',
      );
    }
  }

  try {
    const { data, error } = await supabase.rpc('validate_app_promo_code', {
      p_user_id: userId,
      p_code: normalizedCode,
      p_booking_amount: bookingAmountValue,
      p_trip_meta: tripMeta,
    });

    if (error) throw error;

    return normalizePromoPreview(
      data,
      normalizedCode,
      'validate_app_promo_code',
    );
  } catch (error) {
    if (isMissingRpcError(error, 'validate_app_promo_code')) {
      return buildUnavailableResult(
        normalizedCode,
        'نظام أكواد الخصم محتاج يتفعل أولاً من Supabase SQL Editor.',
      );
    }

    const normalized = normalizeSupabaseError(error);
    log.error('promo_validation_failed', {
      userId,
      promoCode: normalizedCode,
      stage,
      error: normalized,
    });

    return buildUnavailableResult(
      normalizedCode,
      'تعذر مراجعة كود الخصم حالياً.',
    );
  }
}

export { validatePromoCode as previewPromoCode };

export async function getPromoPopupOffer({ userId, context = {} }) {
  const targetedOffer = await getTargetedPromoOffer({ userId, context });
  if (targetedOffer) {
    return targetedOffer;
  }

  try {
    const { data, error } = await supabase.rpc('get_promo_popup_offer', {
      p_user_id: userId,
    });

    if (error) throw error;

    return data ? normalizeOffer(data) : null;
  } catch (error) {
    if (!isMissingRpcError(error, 'get_promo_popup_offer')) {
      log.warn('promo_popup_fetch_failed', {
        userId,
        error: normalizeSupabaseError(error),
      });
    }

    return null;
  }
}
