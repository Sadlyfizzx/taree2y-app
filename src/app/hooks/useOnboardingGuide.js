import { useEffect, useMemo, useState } from 'react';
import { createLogger } from '../../lib/logger';
import { markOnboardingComplete } from '../../lib/account';

const log = createLogger('onboarding-guide');

function readLocalFlag(key) {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeLocalFlag(key, value) {
  if (typeof window === 'undefined') return;

  try {
    if (value) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

export function useOnboardingGuide({ userId, profile, onProfileUpdated }) {
  const storageKey = useMemo(
    () => (userId ? `taree2y_onboarding_seen_${userId}` : 'taree2y_onboarding_seen_guest'),
    [userId],
  );

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isGuideSaving, setIsGuideSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;

    if (profile?.onboarding_completed_at) {
      writeLocalFlag(storageKey, true);
      return;
    }

    if (readLocalFlag(storageKey)) return;
    setIsGuideOpen(true);
  }, [profile?.onboarding_completed_at, storageKey, userId]);

  const openGuide = () => setIsGuideOpen(true);

  const persistGuideSeen = async () => {
    if (!userId || profile?.onboarding_completed_at) {
      writeLocalFlag(storageKey, true);
      return;
    }

    setIsGuideSaving(true);
    try {
      const { data, error } = await markOnboardingComplete(userId);
      if (error) {
        log.warn('onboarding_seen_persist_failed', { userId, error });
        writeLocalFlag(storageKey, true);
        return;
      }

      writeLocalFlag(storageKey, true);
      onProfileUpdated?.(data);
    } finally {
      setIsGuideSaving(false);
    }
  };

  const closeGuide = async ({ remember = true } = {}) => {
    setIsGuideOpen(false);
    if (!remember) return;
    await persistGuideSeen();
  };

  const completeGuide = async () => {
    setIsGuideOpen(false);
    await persistGuideSeen();
  };

  return {
    hasSeenGuide: Boolean(profile?.onboarding_completed_at) || readLocalFlag(storageKey),
    isGuideOpen,
    isGuideSaving,
    openGuide,
    closeGuide,
    completeGuide,
  };
}
