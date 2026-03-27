import { useEffect, useMemo, useRef, useState } from 'react';

function readOnlineState() {
  if (typeof navigator === 'undefined') return true;
  if (typeof navigator.onLine !== 'boolean') return true;
  return navigator.onLine;
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(readOnlineState);
  const [showBanner, setShowBanner] = useState(false);
  const [justRestored, setJustRestored] = useState(false);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const clearHideTimer = () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const hideBannerSoon = () => {
      clearHideTimer();
      hideTimerRef.current = window.setTimeout(() => {
        setShowBanner(false);
        setJustRestored(false);
      }, 3600);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setJustRestored(true);
      setShowBanner(true);
      hideBannerSoon();
    };

    const handleOffline = () => {
      clearHideTimer();
      setIsOnline(false);
      setJustRestored(false);
      setShowBanner(true);
    };

    const initialOnline = readOnlineState();
    setIsOnline(initialOnline);
    setShowBanner(!initialOnline);
    setJustRestored(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearHideTimer();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const statusText = useMemo(
    () => (isOnline ? 'أنت متصل بالإنترنت' : 'أنت أوفلاين حالياً'),
    [isOnline],
  )

  return {
    isOnline,
    showBanner,
    justRestored,
    statusText,
  }
}

export default useNetworkStatus;
