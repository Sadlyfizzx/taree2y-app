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

export async function cancelBookingAtomicCompat({ bookingId, clientActionId = '' }) {
  const safeBookingId = String(bookingId || '').trim();
  if (!safeBookingId) {
    return { ok: false, errorClass: 'invalid_input', message: 'معرّف الحجز غير صالح.' };
  }

  const safeClientActionId = String(
    clientActionId || `cancel-${safeBookingId}-${Date.now()}`,
  ).trim();

  try {
    const { data, error } = await supabase.rpc('cancel_booking_atomic', {
      p_booking_id: safeBookingId,
      p_client_action_id: safeClientActionId,
    });

    if (error) throw error;

    const result = normalizeCancelResult(data);
    if (!result.message && result.ok) {
      result.message = 'تم إلغاء الحجز بنجاح.';
    }
    return result;
  } catch (error) {
    const normalized = normalizeSupabaseError(error);
    const payload = JSON.stringify(normalized).toLowerCase();


    if (payload.includes('has no field "date"')) {
      return {
        ok: false,
        errorClass: 'server_function_bug',
        message: 'فيه خطأ داخل دالة الإلغاء على السيرفر: الحقل date غير موجود في السجل المستخدم داخل الـ RPC. محتاج تعديل SQL في cancel_booking_atomic.',
        error: normalized,
      };
    }

    if (
      payload.includes('could not choose the best candidate function') ||
      payload.includes('42725') ||
      payload.includes('ambiguous')
    ) {
      log.warn('cancel_booking_ambiguous_signature', {
        bookingId: safeBookingId,
        error: normalized,
      });
      return {
        ok: false,
        errorClass: 'rpc_error',
        message:
          'فيه تعارض بين نسختين من دالة الإلغاء على السيرفر. الفرونت بقى بيطلب التوقيع الأوضح، ولو لسه الخطأ موجود يبقى محتاج إزالة النسخة القديمة من الـ RPC من قاعدة البيانات.',
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
