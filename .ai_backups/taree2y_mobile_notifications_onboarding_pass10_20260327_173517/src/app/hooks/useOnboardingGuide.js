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

function readSessionFlag(key) {
  if (typeof window === 'undefined') return false;

  try {
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeSessionFlag(key, value) {
  if (typeof window === 'undefined') return;

  try {
    if (value) window.sessionStorage.setItem(key, '1');
    else window.sessionStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

export function useOnboardingGuide({ userId, profile, onProfileUpdated }) {
  const completedStorageKey = useMemo(
    () => (userId ? `taree2y_onboarding_completed_${userId}` : 'taree2y_onboarding_completed_guest'),
    [userId],
  );
  const dismissedSessionKey = useMemo(
    () => (userId ? `taree2y_onboarding_dismissed_${userId}` : 'taree2y_onboarding_dismissed_guest'),
    [userId],
  );

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isGuideSaving, setIsGuideSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (profile?.onboarding_completed_at) {
      writeLocalFlag(completedStorageKey, true);
      writeSessionFlag(dismissedSessionKey, false);
      return;
    }

    if (readLocalFlag(completedStorageKey)) return;
    if (readSessionFlag(dismissedSessionKey)) return;
    setIsGuideOpen(true);
  }, [completedStorageKey, dismissedSessionKey, profile?.onboarding_completed_at, userId]);

  const openGuide = () => setIsGuideOpen(true);

  const closeGuide = ({ remember = true } = {}) => {
    if (remember) writeSessionFlag(dismissedSessionKey, true);
    setIsGuideOpen(false);
  };

  const completeGuide = async () => {
    if (!userId) {
      closeGuide();
      return;
    }

    setIsGuideSaving(true);

    try {
      const { data, error } = await markOnboardingComplete(userId);

      if (error) {
        log.warn('onboarding_complete_failed', {
          userId,
          error,
        });
      } else {
        writeLocalFlag(completedStorageKey, true);
        writeSessionFlag(dismissedSessionKey, false);
        onProfileUpdated?.(data);
      }
    } finally {
      setIsGuideSaving(false);
      setIsGuideOpen(false);
    }
  };

  return {
    hasSeenGuide:
      Boolean(profile?.onboarding_completed_at) ||
      readLocalFlag(completedStorageKey) ||
      readSessionFlag(dismissedSessionKey),
    isGuideOpen,
    isGuideSaving,
    openGuide,
    closeGuide,
    completeGuide,
  };
}
