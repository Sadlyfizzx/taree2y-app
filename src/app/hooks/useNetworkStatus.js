import { useEffect, useMemo, useRef, useState } from 'react';

function readConnectionSnapshot() {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const connection = nav?.connection || nav?.mozConnection || nav?.webkitConnection || null;
  const isOnline =
    typeof nav?.onLine === 'boolean'
      ? nav.onLine
      : true;

  const effectiveType = String(connection?.effectiveType || '').trim().toLowerCase();
  const downlinkMbps = Number(connection?.downlink || 0);
  const saveData = Boolean(connection?.saveData);

  let connectionTier = 'normal';
  let connectionLabel = 'الاتصال مستقر';

  if (!isOnline) {
    connectionTier = 'offline';
    connectionLabel = 'أوفلاين';
  } else if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g' || downlinkMbps && downlinkMbps < 1.2) {
    connectionTier = 'slow';
    connectionLabel = 'اتصال ضعيف';
  } else if (effectiveType === '3g' || (downlinkMbps && downlinkMbps < 4)) {
    connectionTier = 'medium';
    connectionLabel = 'اتصال متوسط';
  } else if (effectiveType === '4g' || (downlinkMbps && downlinkMbps >= 4)) {
    connectionTier = 'fast';
    connectionLabel = 'اتصال سريع';
  }

  return {
    isOnline,
    effectiveType,
    downlinkMbps: Number.isFinite(downlinkMbps) ? downlinkMbps : 0,
    saveData,
    connectionTier,
    connectionLabel,
  };
}

export function useNetworkStatus() {
  const [snapshot, setSnapshot] = useState(readConnectionSnapshot);
  const [justRestored, setJustRestored] = useState(false);
  const restoreTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const clearRestoreTimer = () => {
      if (restoreTimerRef.current) {
        window.clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = null;
      }
    };

    const syncSnapshot = () => {
      setSnapshot(readConnectionSnapshot());
    };

    const handleOnline = () => {
      syncSnapshot();
      setJustRestored(true);
      clearRestoreTimer();
      restoreTimerRef.current = window.setTimeout(() => {
        setJustRestored(false);
      }, 3600);
    };

    const handleOffline = () => {
      clearRestoreTimer();
      setJustRestored(false);
      syncSnapshot();
    };

    const connection = navigator?.connection || navigator?.mozConnection || navigator?.webkitConnection || null;

    syncSnapshot();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    connection?.addEventListener?.('change', syncSnapshot);

    return () => {
      clearRestoreTimer();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      connection?.removeEventListener?.('change', syncSnapshot);
    };
  }, []);

  return useMemo(
    () => ({
      ...snapshot,
      justRestored,
    }),
    [justRestored, snapshot],
  );
}

export default useNetworkStatus;
