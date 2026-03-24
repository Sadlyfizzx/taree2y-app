import { useEffect, useMemo, useState } from 'react';
import { createLogger } from '../../lib/logger';
import { markOnboardingComplete } from '../../lib/account';

const log = createLogger('onboarding-guide');
const SESSION_PREFIX = 'taree2y_onboarding_seen_';

function readSessionFlag(key) {
  try {
    return sessionStorage.getItem(key) === 'done';
  } catch {
    return false;
  }
}

function persistSessionFlag(key) {
  try {
    sessionStorage.setItem(key, 'done');
  } catch {
    // ignore storage failures
  }
}

export function useOnboardingGuide({ userId, profile, onProfileUpdated }) {
  const sessionKey = useMemo(
    () => `${SESSION_PREFIX}${userId || 'guest'}`,
    [userId],
  );
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isGuideSaving, setIsGuideSaving] = useState(false);

  useEffect(() => {
    if (!userId || profile?.onboarding_completed_at) return;
    if (readSessionFlag(sessionKey)) return;
    setIsGuideOpen(true);
  }, [profile?.onboarding_completed_at, sessionKey, userId]);

  const openGuide = () => setIsGuideOpen(true);

  const closeGuide = () => {
    persistSessionFlag(sessionKey);
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
        onProfileUpdated?.(data);
      }
    } finally {
      setIsGuideSaving(false);
      closeGuide();
    }
  };

  return {
    hasSeenGuide: Boolean(profile?.onboarding_completed_at),
    isGuideOpen,
    isGuideSaving,
    openGuide,
    closeGuide,
    completeGuide,
  };
}
