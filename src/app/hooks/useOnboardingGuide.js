/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';

const ONBOARDING_KEY = 'taree2y_onboarding_seen_v2';

function readSeenFlag() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'done';
  } catch {
    return false;
  }
}

function persistSeenFlag(nextValue) {
  try {
    if (nextValue) {
      localStorage.setItem(ONBOARDING_KEY, 'done');
    } else {
      localStorage.removeItem(ONBOARDING_KEY);
    }
  } catch {
    // ignore storage errors in private mode
  }
}

export function useOnboardingGuide() {
  const [hasSeenGuide, setHasSeenGuide] = useState(readSeenFlag);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    if (!hasSeenGuide) {
      setIsGuideOpen(true);
    }
  }, [hasSeenGuide]);

  const openGuide = () => setIsGuideOpen(true);
  const closeGuide = () => setIsGuideOpen(false);

  const completeGuide = () => {
    persistSeenFlag(true);
    setHasSeenGuide(true);
    setIsGuideOpen(false);
  };

  const resetGuide = () => {
    persistSeenFlag(false);
    setHasSeenGuide(false);
    setIsGuideOpen(true);
  };

  return {
    hasSeenGuide,
    isGuideOpen,
    openGuide,
    closeGuide,
    completeGuide,
    resetGuide,
  };
}
