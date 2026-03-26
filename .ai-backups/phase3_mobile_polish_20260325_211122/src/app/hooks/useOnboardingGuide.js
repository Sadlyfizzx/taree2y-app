import { useEffect, useState } from 'react';
import { createLogger } from '../../lib/logger';
import { markOnboardingComplete } from '../../lib/account';

const log = createLogger('onboarding-guide');

export function useOnboardingGuide({ userId, profile, onProfileUpdated }) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isGuideSaving, setIsGuideSaving] = useState(false);

  useEffect(() => {
    if (!userId || profile?.onboarding_completed_at) return;
    setIsGuideOpen(true);
  }, [profile?.onboarding_completed_at, userId]);

  const openGuide = () => setIsGuideOpen(true);

  const closeGuide = () => {
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
