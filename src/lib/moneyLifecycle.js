import { supabase } from './supabase';
import {
  createLogger,
  isMissingRpcError,
  normalizeSupabaseError,
} from './logger';

const log = createLogger('money-lifecycle');

export function isAuthoritativeRuntime(runtimeMode = 'supabase') {
  return String(runtimeMode || 'supabase') !== 'local-demo';
}

export function createClientMoneyId(prefix = 'money') {
  const safePrefix = String(prefix || 'money')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-') || 'money';

  const stamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `${safePrefix}-${stamp}-${random}`;
}

function normalizeResponseShape(data, fallbackCode, fallbackMessage) {
  const payload = data && typeof data === 'object' ? data : {};
  const normalizedData =
    payload.data && typeof payload.data === 'object' ? payload.data : {};

  return {
    ok: payload.ok === true,
    code: String(payload.code || fallbackCode || 'money_unknown'),
    message: String(payload.message || fallbackMessage || 'تعذر تنفيذ العملية المالية حالياً.'),
    data: normalizedData,
    unavailable: Boolean(payload.unavailable || normalizedData.unavailable),
  };
}

function buildMissingRpcResult(message, code) {
  return {
    ok: false,
    code,
    message,
    data: {},
    unavailable: true,
  };
}

function buildErrorResult(error, fallbackCode, fallbackMessage) {
  const normalized = normalizeSupabaseError(error);
  log.error('money_rpc_failed', {
    code: fallbackCode,
    error: normalized,
  });

  return {
    ok: false,
    code: fallbackCode,
    message: normalized.message || fallbackMessage,
    data: {},
    unavailable: false,
  };
}

export async function redeemPointsAtomic({
  pointsToSpend = 500,
  walletCredit = 50,
  clientId,
}) {
  try {
    const { data, error } = await supabase.rpc('redeem_loyalty_points_atomic', {
      p_points_to_spend: Number(pointsToSpend),
      p_wallet_credit: Number(walletCredit),
      p_client_id: String(clientId || createClientMoneyId('points')),
    });

    if (error) throw error;

    return normalizeResponseShape(
      data,
      'points_redeemed',
      'تم استبدال النقاط بنجاح.',
    );
  } catch (error) {
    if (isMissingRpcError(error, 'redeem_loyalty_points_atomic')) {
      return buildMissingRpcResult(
        'استبدال النقاط الحقيقي لسه مش متوصل على السيرفر. علشان نحمي الرصيد، الميزة متوقفة حالياً.',
        'points_rpc_missing',
      );
    }

    return buildErrorResult(
      error,
      'points_redeem_failed',
      'تعذر استبدال النقاط حالياً.',
    );
  }
}

export async function purchaseSubscriptionAtomic({
  plan,
  clientId,
}) {
  const safePlan = String(plan || '').trim().toLowerCase();

  if (!['student', 'vip'].includes(safePlan)) {
    return {
      ok: false,
      code: 'subscription_plan_invalid',
      message: 'نوع الباقة غير صحيح.',
      data: {},
      unavailable: false,
    };
  }

  try {
    const { data, error } = await supabase.rpc('purchase_subscription_atomic', {
      p_plan: safePlan,
      p_client_id: String(clientId || createClientMoneyId(`sub-${safePlan}`)),
    });

    if (error) throw error;

    return normalizeResponseShape(
      data,
      'subscription_purchased',
      'تم تفعيل الباقة بنجاح.',
    );
  } catch (error) {
    if (isMissingRpcError(error, 'purchase_subscription_atomic')) {
      return buildMissingRpcResult(
        'تفعيل الباقة الحقيقي لسه مش متوصل على السيرفر. علشان نحمي الرصيد، الميزة متوقفة حالياً.',
        'subscription_rpc_missing',
      );
    }

    return buildErrorResult(
      error,
      'subscription_purchase_failed',
      'تعذر تفعيل الباقة حالياً.',
    );
  }
}
