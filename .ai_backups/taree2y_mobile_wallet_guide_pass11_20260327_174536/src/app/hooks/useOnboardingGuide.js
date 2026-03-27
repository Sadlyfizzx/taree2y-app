import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger } from '../../lib/logger';
import { markOnboardingComplete } from '../../lib/account';

const log = createLogger('onboarding-guide');

export function useOnboardingGuide({ userId, profile, onProfileUpdated }) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isGuideSaving, setIsGuideSaving] = useState(false);
  const autoOpenedRef = useRef(false);
  const persistInFlightRef = useRef(false);

  const persistGuideSeen = useCallback(async () => {
    if (!userId || profile?.onboarding_completed_at || persistInFlightRef.current) return;

    persistInFlightRef.current = true;
    try {
      const { data, error } = await markOnboardingComplete(userId);
      if (error) {
        log.warn('onboarding_seen_persist_failed', {
          userId,
          error,
        });
        return;
      }

      onProfileUpdated?.(data);
    } catch (error) {
      log.warn('onboarding_seen_persist_failed', {
        userId,
        error,
      });
    } finally {
      persistInFlightRef.current = false;
    }
  }, [onProfileUpdated, profile?.onboarding_completed_at, userId]);

  useEffect(() => {
    if (!userId) return;
    if (profile?.onboarding_completed_at) {
      autoOpenedRef.current = true;
      setIsGuideOpen(false);
      return;
    }

    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    setIsGuideOpen(true);
  }, [profile?.onboarding_completed_at, userId]);

  const openGuide = () => setIsGuideOpen(true);

  const closeGuide = ({ persist = true } = {}) => {
    setIsGuideOpen(false);
    if (persist) {
      void persistGuideSeen();
    }
  };

  const completeGuide = async () => {
    if (!userId) {
      setIsGuideOpen(false);
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
      setIsGuideOpen(false);
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
