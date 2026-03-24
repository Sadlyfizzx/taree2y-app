import { supabase } from './supabase';
import { createLogger, normalizeSupabaseError } from './logger';

const log = createLogger('account');

function normalizeText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function compactObject(input) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

function isMissingColumnError(error) {
  const normalized = normalizeSupabaseError(error);
  const payload = JSON.stringify(normalized).toLowerCase();
  return (
    payload.includes('column') &&
    (payload.includes('does not exist') || payload.includes('not found'))
  );
}

function buildBaseProfile(user) {
  return {
    id: user?.id || '',
    display_name:
      user?.user_metadata?.display_name ||
      user?.email?.split('@')[0] ||
      'مستخدم',
    phone: normalizeText(user?.user_metadata?.phone) || '',
    address_line1: '',
    address_line2: '',
    city: '',
    emergency_phone: '',
    onboarding_completed_at: null,
    first_app_open_at: null,
    last_offer_popup_at: null,
    email: user?.email || '',
  };
}

export function normalizeProfileRow(row, user) {
  const base = buildBaseProfile(user);
  const safeRow = row && typeof row === 'object' ? row : {};

  return {
    ...base,
    ...safeRow,
    display_name: safeRow.display_name || base.display_name,
    phone: normalizeText(safeRow.phone) || base.phone || '',
    address_line1: normalizeText(safeRow.address_line1) || '',
    address_line2: normalizeText(safeRow.address_line2) || '',
    city: normalizeText(safeRow.city) || '',
    emergency_phone: normalizeText(safeRow.emergency_phone) || '',
    onboarding_completed_at: safeRow.onboarding_completed_at || null,
    first_app_open_at: safeRow.first_app_open_at || null,
    last_offer_popup_at: safeRow.last_offer_popup_at || null,
    email: user?.email || safeRow.email || base.email,
    isFirstTimeUser: !safeRow.onboarding_completed_at,
  };
}

function buildExtendedProfilePayload(user, currentProfile = {}) {
  const profile = normalizeProfileRow(currentProfile, user);
  const nowIso = new Date().toISOString();

  return {
    id: user.id,
    display_name: profile.display_name,
    phone: normalizeText(profile.phone),
    address_line1: normalizeText(profile.address_line1),
    address_line2: normalizeText(profile.address_line2),
    city: normalizeText(profile.city),
    emergency_phone: normalizeText(profile.emergency_phone),
    onboarding_completed_at: profile.onboarding_completed_at,
    first_app_open_at: profile.first_app_open_at || nowIso,
    last_offer_popup_at: profile.last_offer_popup_at,
  };
}

async function upsertProfilePayload(payload) {
  let response = await supabase
    .from('profiles')
    .upsert(payload)
    .select('*')
    .maybeSingle();

  if (response.error && isMissingColumnError(response.error)) {
    const fallbackPayload = compactObject({
      id: payload.id,
      display_name: payload.display_name,
      phone: payload.phone,
    });

    response = await supabase
      .from('profiles')
      .upsert(fallbackPayload)
      .select('*')
      .maybeSingle();
  }

  return response;
}

export async function ensureProfileForUser(user) {
  if (!user?.id) {
    return {
      data: null,
      error: new Error('Missing user id'),
    };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    log.warn('profile_select_failed', {
      userId: user.id,
      error,
    });

    const fallbackResponse = await upsertProfilePayload(
      buildExtendedProfilePayload(user),
    );

    return {
      data: normalizeProfileRow(fallbackResponse.data, user),
      error: fallbackResponse.error,
    };
  }

  if (!data) {
    const createResponse = await upsertProfilePayload(
      buildExtendedProfilePayload(user),
    );

    return {
      data: normalizeProfileRow(createResponse.data, user),
      error: createResponse.error,
    };
  }

  const normalized = normalizeProfileRow(data, user);
  const requiresPatch =
    !normalized.display_name ||
    !normalized.first_app_open_at ||
    (normalized.phone && normalized.phone !== data.phone);

  if (!requiresPatch) {
    return {
      data: normalized,
      error: null,
    };
  }

  const patchResponse = await upsertProfilePayload(
    buildExtendedProfilePayload(user, normalized),
  );

  return {
    data: normalizeProfileRow(patchResponse.data || normalized, user),
    error: patchResponse.error,
  };
}

export async function updateProfileDetails(userId, updates) {
  const payload = compactObject({
    id: userId,
    display_name: updates.display_name
      ? String(updates.display_name).trim()
      : undefined,
    phone:
      updates.phone !== undefined ? normalizeText(updates.phone) : undefined,
    address_line1:
      updates.address_line1 !== undefined
        ? normalizeText(updates.address_line1)
        : undefined,
    address_line2:
      updates.address_line2 !== undefined
        ? normalizeText(updates.address_line2)
        : undefined,
    city: updates.city !== undefined ? normalizeText(updates.city) : undefined,
    emergency_phone:
      updates.emergency_phone !== undefined
        ? normalizeText(updates.emergency_phone)
        : undefined,
    onboarding_completed_at: updates.onboarding_completed_at,
    first_app_open_at: updates.first_app_open_at,
    last_offer_popup_at: updates.last_offer_popup_at,
  });

  return upsertProfilePayload(payload);
}

export async function markOnboardingComplete(userId) {
  return updateProfileDetails(userId, {
    onboarding_completed_at: new Date().toISOString(),
    first_app_open_at: new Date().toISOString(),
  });
}

export async function markOfferPopupSeen(userId) {
  return updateProfileDetails(userId, {
    last_offer_popup_at: new Date().toISOString(),
  });
}

export async function updateAccountPassword(password) {
  return supabase.auth.updateUser({ password });
}
