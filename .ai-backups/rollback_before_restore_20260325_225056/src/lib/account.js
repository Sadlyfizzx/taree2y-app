import { supabase } from './supabase';
import { createLogger, isRlsError, normalizeSupabaseError } from './logger';

const log = createLogger('account');

export const PROFILE_ACCOUNT_STATUS = {
  ACTIVE: 'active',
  DELETED: 'deleted',
  DISABLED: 'disabled',
};

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

function normalizeAccountStatus(value) {
  const status = String(value || '').trim().toLowerCase();

  if (status === PROFILE_ACCOUNT_STATUS.DELETED) {
    return PROFILE_ACCOUNT_STATUS.DELETED;
  }

  if (status === PROFILE_ACCOUNT_STATUS.DISABLED) {
    return PROFILE_ACCOUNT_STATUS.DISABLED;
  }

  return PROFILE_ACCOUNT_STATUS.ACTIVE;
}

function buildBaseProfile(user) {
  return {
    id: user?.id || '',
    display_name:
      user?.user_metadata?.display_name ||
      user?.email?.split('@')[0] ||
      'مستخدم',
    phone: normalizeText(user?.user_metadata?.phone) || '',
    account_status: PROFILE_ACCOUNT_STATUS.ACTIVE,
    deleted_at: null,
    created_at: null,
    updated_at: null,
    onboarding_completed_at: null,
    first_app_open_at: null,
    last_offer_popup_at: null,
    email: user?.email || '',
    isFirstTimeUser: true,
  };
}

export function normalizeProfileRow(row, user) {
  const base = buildBaseProfile(user);
  const safeRow = row && typeof row === 'object' ? row : {};

  return {
    ...base,
    ...safeRow,
    display_name: normalizeText(safeRow.display_name) || base.display_name,
    phone: normalizeText(safeRow.phone) || base.phone || '',
    account_status: normalizeAccountStatus(safeRow.account_status),
    deleted_at: safeRow.deleted_at || null,
    created_at: safeRow.created_at || null,
    updated_at: safeRow.updated_at || null,
    onboarding_completed_at: safeRow.onboarding_completed_at || null,
    first_app_open_at: safeRow.first_app_open_at || null,
    last_offer_popup_at: safeRow.last_offer_popup_at || null,
    email: user?.email || safeRow.email || base.email,
    isFirstTimeUser: !safeRow.onboarding_completed_at,
  };
}

function buildProfilePayload(user, currentProfile = {}, overrides = {}) {
  const nextUser = {
    ...user,
    user_metadata: {
      ...(user?.user_metadata || {}),
      ...(currentProfile?.display_name || overrides.display_name
        ? { display_name: overrides.display_name ?? currentProfile.display_name }
        : {}),
      ...(overrides.phone !== undefined || currentProfile?.phone !== undefined
        ? { phone: overrides.phone ?? currentProfile.phone ?? null }
        : {}),
    },
  };

  const profile = normalizeProfileRow(
    { ...currentProfile, ...overrides },
    nextUser,
  );
  const nowIso = new Date().toISOString();

  return compactObject({
    id: user?.id,
    display_name: profile.display_name,
    phone: normalizeText(profile.phone),
    account_status: normalizeAccountStatus(profile.account_status),
    deleted_at: profile.deleted_at || null,
    onboarding_completed_at: profile.onboarding_completed_at || null,
    first_app_open_at: profile.first_app_open_at || nowIso,
    last_offer_popup_at: profile.last_offer_popup_at || null,
    updated_at: nowIso,
  });
}

async function upsertProfilePayload(payload, { allowFallback = true } = {}) {
  const safePayload = compactObject(payload || {});

  let response = await supabase
    .from('profiles')
    .upsert(safePayload, { onConflict: 'id' })
    .select('*')
    .maybeSingle();

  if (response.error && safePayload.id) {
    const updatePayload = compactObject({ ...safePayload });
    delete updatePayload.id;

    if (Object.keys(updatePayload).length > 0) {
      const updateResponse = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', safePayload.id)
        .select('*')
        .maybeSingle();

      if (!updateResponse.error) {
        response = updateResponse;
      }
    }
  }

  if (allowFallback && response.error && isMissingColumnError(response.error)) {
    const fallbackPayload = compactObject({
      id: safePayload.id,
      display_name: safePayload.display_name,
      phone: safePayload.phone,
    });

    response = await supabase
      .from('profiles')
      .upsert(fallbackPayload, { onConflict: 'id' })
      .select('*')
      .maybeSingle();
  }

  return response;
}

export function isInactiveProfile(profile) {
  const status = normalizeAccountStatus(profile?.account_status);
  return (
    status === PROFILE_ACCOUNT_STATUS.DELETED ||
    status === PROFILE_ACCOUNT_STATUS.DISABLED ||
    Boolean(profile?.deleted_at)
  );
}

export async function ensureProfileForUser(user) {
  if (!user?.id) {
    return {
      data: null,
      error: new Error('Missing user id'),
      source: 'missing_user',
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

    if (isRlsError(error)) {
      return {
        data: normalizeProfileRow(null, user),
        error,
        source: 'fallback_rls',
      };
    }

    const fallbackResponse = await upsertProfilePayload(
      buildProfilePayload(user),
      { allowFallback: true },
    );

    return {
      data: normalizeProfileRow(fallbackResponse.data || null, user),
      error: fallbackResponse.error || error,
      source: fallbackResponse.data
        ? 'bootstrapped_after_error'
        : 'fallback_after_error',
    };
  }

  if (!data) {
    const createResponse = await upsertProfilePayload(
      buildProfilePayload(user),
      { allowFallback: true },
    );

    return {
      data: normalizeProfileRow(createResponse.data || null, user),
      error: createResponse.error,
      source: createResponse.data ? 'created' : 'fallback_created',
    };
  }

  const normalized = normalizeProfileRow(data, user);
  const requiresPatch =
    !normalized.display_name ||
    !normalized.first_app_open_at ||
    normalizeText(data.phone) !== (normalized.phone || '') ||
    !normalized.account_status;

  if (!requiresPatch) {
    return {
      data: normalized,
      error: null,
      source: 'db',
    };
  }

  const patchResponse = await upsertProfilePayload(
    buildProfilePayload(user, normalized),
    { allowFallback: true },
  );

  return {
    data: normalizeProfileRow(patchResponse.data || normalized, user),
    error: patchResponse.error,
    source: patchResponse.data ? 'patched' : 'patched_with_fallback',
  };
}

export async function updateProfileDetails(
  userId,
  updates,
  options = { allowFallback: true },
) {
  const nextDisplayName =
    updates.display_name !== undefined
      ? String(updates.display_name).trim() || undefined
      : undefined;
  const nowIso = new Date().toISOString();

  const payload = compactObject({
    id: userId,
    display_name: nextDisplayName,
    phone:
      updates.phone !== undefined ? normalizeText(updates.phone) : undefined,
    account_status:
      updates.account_status !== undefined
        ? normalizeAccountStatus(updates.account_status)
        : undefined,
    deleted_at:
      updates.deleted_at !== undefined ? updates.deleted_at : undefined,
    onboarding_completed_at:
      updates.onboarding_completed_at !== undefined
        ? updates.onboarding_completed_at
        : undefined,
    first_app_open_at:
      updates.first_app_open_at !== undefined
        ? updates.first_app_open_at
        : undefined,
    last_offer_popup_at:
      updates.last_offer_popup_at !== undefined
        ? updates.last_offer_popup_at
        : undefined,
    updated_at: nowIso,
  });

  const response = await upsertProfilePayload(payload, options);

  return {
    data: response.data ? normalizeProfileRow(response.data, { id: userId }) : null,
    error: response.error,
  };
}

export async function softDeleteProfile(userId) {
  const nowIso = new Date().toISOString();

  const response = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      display_name: 'حساب محذوف',
      phone: null,
      account_status: PROFILE_ACCOUNT_STATUS.DELETED,
      deleted_at: nowIso,
      updated_at: nowIso,
    })
    .select('*')
    .maybeSingle();

  return {
    data: response.data
      ? normalizeProfileRow(response.data, {
          id: userId,
          user_metadata: { display_name: 'حساب محذوف' },
        })
      : null,
    error: response.error,
  };
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
