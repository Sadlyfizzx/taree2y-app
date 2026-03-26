import { supabase } from './supabase';
import { createLogger, isMissingRpcError, normalizeSupabaseError } from './logger';

const log = createLogger('cancel-booking-compat');

function normalizeRefundAmount(candidate) {
  const value = Number(
    candidate?.refundAmount ??
      candidate?.refund_amount ??
      candidate?.amount ??
      0,
  );
  return Number.isFinite(value) ? value : 0;
}

function normalizeCancelResult(data) {
  const payload = data && typeof data === 'object' ? data : {};
  const ok = Boolean(payload.ok ?? payload.success ?? true);
  return {
    ...payload,
    ok,
    refundAmount: normalizeRefundAmount(payload),
    message: String(payload.message || payload.notice || '').trim(),
  };
}

function getErrorText(error) {
  const normalized = normalizeSupabaseError(error);
  return JSON.stringify({
    name: normalized?.name,
    code: normalized?.code,
    status: normalized?.status,
    message: normalized?.message,
    details: normalized?.details,
    hint: normalized?.hint,
  }).toLowerCase();
}

function isSignatureMismatch(error) {
  const text = getErrorText(error);
  return (
    text.includes('pgrst202') ||
    text.includes('42883') ||
    text.includes('could not find the function') ||
    text.includes('function does not exist') ||
    text.includes('no function matches') ||
    text.includes('schema cache') ||
    text.includes('unexpected parameter') ||
    text.includes('p_client_action_id') ||
    text.includes('could not choose the best candidate function') ||
    text.includes('42725') ||
    text.includes('ambiguous')
  );
}

async function callCancelBookingAtomicTwoArgs({ safeBookingId, safeClientActionId }) {
  return supabase.rpc('cancel_booking_atomic', {
    p_booking_id: safeBookingId,
    p_client_action_id: safeClientActionId,
  });
}

async function callCancelBookingAtomicSingleArg({ safeBookingId }) {
  return supabase.rpc('cancel_booking_atomic', {
    p_booking_id: safeBookingId,
  });
}

export async function cancelBookingAtomicCompat({ bookingId, clientActionId = '' }) {
  const safeBookingId = String(bookingId || '').trim();
  if (!safeBookingId) {
    return { ok: false, errorClass: 'invalid_input', message: 'معرّف الحجز غير صالح.' };
  }

  const safeClientActionId = String(
    clientActionId || `cancel-${safeBookingId}-${Date.now()}`,
  ).trim();

  try {
    let data;
    let error;

    ({ data, error } = await callCancelBookingAtomicTwoArgs({
      safeBookingId,
      safeClientActionId,
    }));

    if (error && isSignatureMismatch(error)) {
      log.warn('cancel_booking_retrying_single_signature', {
        bookingId: safeBookingId,
        error: normalizeSupabaseError(error),
      });

      ({ data, error } = await callCancelBookingAtomicSingleArg({ safeBookingId }));
    }

    if (error) throw error;

    const result = normalizeCancelResult(data);
    if (!result.message && result.ok) {
      result.message = 'تم إلغاء الحجز بنجاح.';
    }
    return result;
  } catch (error) {
    const normalized = normalizeSupabaseError(error);
    const payload = getErrorText(error);

    if (payload.includes('has no field "date"')) {
      return {
        ok: false,
        errorClass: 'server_function_bug',
        message: 'فيه خطأ داخل دالة الإلغاء على السيرفر: الحقل date غير موجود في السجل المستخدم داخل الـ RPC. محتاج تعديل SQL في cancel_booking_atomic.',
        error: normalized,
      };
    }

    if (isSignatureMismatch(error)) {
      log.warn('cancel_booking_signature_mismatch', {
        bookingId: safeBookingId,
        error: normalized,
      });
      return {
        ok: false,
        errorClass: 'rpc_error',
        message:
          'فيه عدم تطابق بين توقيع دالة الإلغاء في الفرونت وقاعدة البيانات. الباتش جرّب التوقيعين، ولو لسه الخطأ موجود يبقى لازم نراجع تعريف cancel_booking_atomic الحالي في Supabase.',
        error: normalized,
      };
    }

    if (isMissingRpcError(error, 'cancel_booking_atomic')) {
      return {
        ok: false,
        errorClass: 'missing_rpc',
        message: 'دالة الإلغاء غير متاحة على السيرفر حالياً.',
        error: normalized,
      };
    }

    return {
      ok: false,
      errorClass: 'rpc_error',
      message: normalized.message || 'تعذر إلغاء الحجز حالياً.',
      error: normalized,
    };
  }
}
