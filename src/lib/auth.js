import { supabase } from './supabase';
import {
  createLogger,
  isMissingRpcError,
  isNetworkError,
  isRateLimitError,
  isRlsError,
  normalizeSupabaseError,
} from './logger';
import {
  ensureProfileForUser,
  normalizeProfileRow,
  softDeleteProfile,
  updateProfileDetails,
} from './account';

const log = createLogger('auth');
let pendingAccountAccessNotice = '';

function normalizeText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getPasswordResetRedirectUrl() {
  if (typeof window === 'undefined') return undefined;

  try {
    const nextUrl = new URL(window.location.origin);
    nextUrl.pathname = '/profile';
    nextUrl.searchParams.set('reset', '1');
    return nextUrl.toString();
  } catch {
    return undefined;
  }
}

export function extractRateLimitSeconds(message = '') {
  const rawMessage = String(message || '');
  const directMatch = rawMessage.match(/after\s+(\d+)\s+seconds?/i);
  if (directMatch) return Number(directMatch[1]) || 0;

  const retryAfterMatch = rawMessage.match(/retry\s+after\s+(\d+)/i);
  if (retryAfterMatch) return Number(retryAfterMatch[1]) || 0;

  return 0;
}

export function setAccountAccessNotice(message) {
  const safeMessage = normalizeText(message);
  if (!safeMessage) return;
  pendingAccountAccessNotice = safeMessage;
}

export function consumeAccountAccessNotice() {
  const nextMessage = normalizeText(pendingAccountAccessNotice);
  pendingAccountAccessNotice = '';
  return nextMessage;
}

export function getFriendlyAuthError(error, context = 'generic') {
  const normalized = normalizeSupabaseError(error);
  const rawMessage = normalizeText(normalized.message) || 'حصل خطأ غير متوقع.';
  const lower = rawMessage.toLowerCase();
  const waitSeconds = extractRateLimitSeconds(rawMessage);

  if (isNetworkError(error)) {
    if (context === 'logout') {
      return 'تم تسجيل الخروج من الجهاز الحالي، لكن تعذر تأكيد الخروج على السيرفر بسبب الاتصال.';
    }

    return 'تعذر الاتصال بالسيرفر حالياً. اتأكد من الإنترنت وحاول تاني.';
  }

  if (isRateLimitError(error) || waitSeconds > 0) {
    return waitSeconds > 0
      ? `استنى ${waitSeconds} ثانية قبل ما تعيد المحاولة.`
      : 'المحاولات زادت بسرعة. استنى شوية وجرب تاني.';
  }

  if (lower.includes('invalid login credentials')) {
    return 'الإيميل أو الباسورد غير صحيح.';
  }

  if (lower.includes('email not confirmed')) {
    return 'أكد الإيميل الأول من الرسالة اللي وصلتك وبعدها سجّل دخول.';
  }

  if (lower.includes('user already registered')) {
    return 'الإيميل ده عليه حساب بالفعل. جرّب تسجيل الدخول.';
  }

  if (lower.includes('password should be at least')) {
    return 'الباسورد لازم يبقى 6 حروف أو أكتر.';
  }

  if (context === 'delete_account' && isMissingRpcError(error, 'request_self_account_deletion')) {
    return 'ميزة حذف الحساب الذاتي محتاجة SQL يدوي في Supabase SQL Editor.';
  }

  if (
    context === 'delete_account' &&
    (lower.includes('account_status') || lower.includes('deleted_at'))
  ) {
    return 'ميزة حذف الحساب محتاجة أعمدة account_status و deleted_at على جدول profiles.';
  }

  if (isRlsError(error) && lower.includes('profiles')) {
    return 'إعدادات صلاحيات جدول profiles على Supabase محتاجة مراجعة من SQL Editor.';
  }

  if (context === 'profile') {
    return rawMessage || 'تعذر تحديث بيانات الحساب حالياً.';
  }

  if (context === 'password') {
    return rawMessage || 'تعذر تغيير الباسورد حالياً.';
  }

  if (context === 'reset_password') {
    return rawMessage || 'تعذر إرسال رابط استرجاع الباسورد حالياً.';
  }

  if (context === 'logout') {
    return rawMessage || 'تعذر تسجيل الخروج حالياً.';
  }

  return rawMessage || 'حصل خطأ أثناء المحاولة.';
}

export async function signInWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUpWithEmail({
  email,
  password,
  displayName,
  phone,
}) {
  const safeDisplayName = normalizeText(displayName);
  const safePhone = normalizeText(phone);

  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      data: {
        display_name: safeDisplayName,
        phone: safePhone,
      },
    },
  });

  if (error) throw error;

  if (data.session?.user?.id) {
    const profileResponse = await updateProfileDetails(data.session.user.id, {
      display_name:
        safeDisplayName ||
        data.session.user.email?.split('@')[0] ||
        'مستخدم',
      phone: safePhone,
      account_status: 'active',
    });

    if (profileResponse.error) {
      log.warn('signup_profile_sync_failed', {
        userId: data.session.user.id,
        error: profileResponse.error,
      });
    }
  }

  return data;
}

export async function requestPasswordReset(email) {
  const safeEmail = normalizeEmail(email);
  if (!safeEmail) {
    throw new Error('اكتب الإيميل الأول.');
  }

  const redirectTo = getPasswordResetRedirectUrl();
  const { data, error } = await supabase.auth.resetPasswordForEmail(
    safeEmail,
    redirectTo ? { redirectTo } : undefined,
  );

  if (error) throw error;
  return data;
}

export async function signOutCurrentUser() {
  const globalResponse = await supabase.auth.signOut();

  if (!globalResponse.error) {
    return {
      ok: true,
      usedLocalFallback: false,
      error: null,
    };
  }

  if (!isNetworkError(globalResponse.error)) {
    return {
      ok: false,
      usedLocalFallback: false,
      error: globalResponse.error,
    };
  }

  const localResponse = await supabase.auth.signOut({ scope: 'local' });

  if (localResponse.error) {
    return {
      ok: false,
      usedLocalFallback: false,
      error: localResponse.error,
    };
  }

  return {
    ok: true,
    usedLocalFallback: true,
    error: null,
  };
}

export async function loadCurrentProfile(user) {
  return ensureProfileForUser(user);
}

export async function updateCurrentUserProfile({ displayName, phone }) {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) throw authError;

  const authUser = authData?.user;
  if (!authUser?.id) {
    throw new Error('لا يوجد مستخدم مسجل حالياً.');
  }

  const normalizedDisplayName =
    normalizeText(displayName) ||
    authUser.user_metadata?.display_name ||
    authUser.email?.split('@')[0] ||
    'مستخدم';
  const normalizedPhone = normalizeText(phone);

  const profileResponse = await updateProfileDetails(authUser.id, {
    display_name: normalizedDisplayName,
    phone: normalizedPhone,
    account_status: 'active',
  });

  if (profileResponse.error) throw profileResponse.error;

  const { error: updateUserError } = await supabase.auth.updateUser({
    data: {
      ...(authUser.user_metadata || {}),
      display_name: normalizedDisplayName,
      phone: normalizedPhone,
    },
  });

  if (updateUserError) throw updateUserError;

  return normalizeProfileRow(
    profileResponse.data || {
      display_name: normalizedDisplayName,
      phone: normalizedPhone,
    },
    {
      ...authUser,
      user_metadata: {
        ...(authUser.user_metadata || {}),
        display_name: normalizedDisplayName,
        phone: normalizedPhone,
      },
    },
  );
}

export async function requestCurrentUserDeletion() {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) throw authError;

  const authUser = authData?.user;
  if (!authUser?.id) {
    throw new Error('لا يوجد مستخدم مسجل حالياً.');
  }

  let mode = 'rpc';
  let authUserDeleted = false;

  try {
    const { data, error } = await supabase.rpc('request_self_account_deletion');

    if (error) throw error;

    authUserDeleted = Boolean(
      data?.auth_user_deleted ?? data?.authUserDeleted ?? false,
    );
    mode = data?.mode || 'rpc';
  } catch (error) {
    if (!isMissingRpcError(error, 'request_self_account_deletion')) {
      throw error;
    }

    mode = 'profile_soft_delete';
    const softDeleteResponse = await softDeleteProfile(authUser.id);

    if (softDeleteResponse.error) {
      throw softDeleteResponse.error;
    }
  }

  const signOutResult = await signOutCurrentUser();
  if (!signOutResult.ok) {
    throw signOutResult.error;
  }

  setAccountAccessNotice(
    'تم تعطيل الحساب داخل التطبيق وتسجيل خروجك بنجاح.',
  );

  return {
    ok: true,
    mode,
    authUserDeleted,
  };
}

export function buildBlockedAccountMessage(profile) {
  const status = String(profile?.account_status || '').toLowerCase();

  if (status === 'disabled') {
    return 'تم إيقاف الحساب داخل التطبيق. لو ده حصل بالخطأ، تواصل مع الدعم.';
  }

  return 'الحساب ده متحذّف أو متوقف داخل التطبيق، فتم تسجيل خروجك.';
}
