import { supabase } from './supabase';
import { createLogger, normalizeSupabaseError } from './logger';

const log = createLogger('promo-engine');

const emptyResult = {
  ok: true,
  applied: false,
  code: '',
  title: '',
  description: '',
  message: '',
  discountAmount: 0,
  unavailable: false,
};

function isMissingRpcError(error) {
  const normalized = normalizeSupabaseError(error);
  const payload = JSON.stringify(normalized).toLowerCase();

  return (
    payload.includes('could not find the function') ||
    payload.includes('schema cache') ||
    payload.includes('not found')
  );
}

function normalizeDiscount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function normalizeValidationPayload(data, fallbackCode = '') {
  if (!data) {
    return {
      ...emptyResult,
      code: fallbackCode,
      message: 'الكود غير متاح حالياً.',
    };
  }

  return {
    ok: data.ok !== false,
    applied: Boolean(data.applied),
    code: String(data.code || fallbackCode || '').trim().toUpperCase(),
    title: data.title || '',
    description: data.description || '',
    message: data.message || '',
    discountAmount: normalizeDiscount(
      data.discount_amount ?? data.discountAmount,
    ),
    unavailable: Boolean(data.unavailable),
    startsAt: data.starts_at || data.startsAt || null,
    endsAt: data.ends_at || data.endsAt || null,
    discountType: data.discount_type || data.discountType || '',
  };
}

function normalizeOffer(data) {
  if (!data) return null;

  return {
    code: String(data.code || '').trim().toUpperCase(),
    title: data.title || 'عرض خاص',
    description: data.description || '',
    message: data.message || '',
    startsAt: data.starts_at || data.startsAt || null,
    endsAt: data.ends_at || data.endsAt || null,
    discountType: data.discount_type || data.discountType || '',
    discountValue: normalizeDiscount(
      data.discount_value ?? data.discountValue,
    ),
    popupEnabled: Boolean(data.popup_enabled ?? data.popupEnabled ?? true),
  };
}

export async function validatePromoCode({
  userId,
  code,
  bookingAmount,
  tripMeta = {},
}) {
  const normalizedCode = String(code || '').trim().toUpperCase();

  if (!normalizedCode) {
    return emptyResult;
  }

  try {
    const { data, error } = await supabase.rpc('validate_app_promo_code', {
      p_user_id: userId,
      p_code: normalizedCode,
      p_booking_amount: Number(bookingAmount || 0),
      p_trip_meta: tripMeta,
    });

    if (error) throw error;

    return normalizeValidationPayload(data, normalizedCode);
  } catch (error) {
    if (isMissingRpcError(error)) {
      return {
        ...emptyResult,
        code: normalizedCode,
        ok: false,
        unavailable: true,
        message:
          'نظام أكواد الخصم محتاج يتفعل أولاً من Supabase SQL Editor.',
      };
    }

    log.error('promo_validation_failed', {
      userId,
      code: normalizedCode,
      error,
    });

    return {
      ...emptyResult,
      code: normalizedCode,
      ok: false,
      message: 'تعذر مراجعة كود الخصم حالياً.',
    };
  }
}

export async function getPromoPopupOffer({ userId }) {
  try {
    const { data, error } = await supabase.rpc('get_promo_popup_offer', {
      p_user_id: userId,
    });

    if (error) throw error;

    return normalizeOffer(data);
  } catch (error) {
    if (!isMissingRpcError(error)) {
      log.warn('promo_popup_fetch_failed', {
        userId,
        error,
      });
    }

    return null;
  }
}
