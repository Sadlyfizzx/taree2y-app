import { useEffect, useRef } from 'react';

let lastReloadAt = 0;

function normalizeAssetPath(value) {
  try {
    const url = new URL(String(value || ''), window.location.origin);
    return url.pathname || '';
  } catch {
    return '';
  }
}

function isRelevantAssetPath(pathname = '') {
  return pathname === '/src/main.jsx' || pathname.startsWith('/assets/');
}

function collectAssetsFromDocument(doc) {
  if (!doc?.querySelectorAll) return '';

  const assets = new Set();

  doc.querySelectorAll('script[src], link[href]').forEach((node) => {
    const attr = node.getAttribute('src') || node.getAttribute('href') || '';
    const pathname = normalizeAssetPath(attr);

    if (!isRelevantAssetPath(pathname)) return;
    assets.add(pathname);
  });

  return Array.from(assets).sort().join('|');
}

function canReloadNow() {
  return !Number.isFinite(lastReloadAt) || Date.now() - lastReloadAt > 15000;
}

function markReloadNow() {
  lastReloadAt = Date.now();
}

async function fetchRemoteAssetSignature() {
  const response = await fetch(`/index.html?__deploy_check=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`index_fetch_failed_${response.status}`);
  }

  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return collectAssetsFromDocument(doc);
}

export function useDeploymentRefresh({
  enabled = !import.meta.env.DEV,
  checkIntervalMs = 60000,
} = {}) {
  const currentSignatureRef = useRef('');
  const checkingRef = useRef(false);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    currentSignatureRef.current = collectAssetsFromDocument(document);

    const checkForNewDeploy = async () => {
      if (checkingRef.current || reloadingRef.current) return;

      checkingRef.current = true;

      try {
        const latestSignature = await fetchRemoteAssetSignature();

        if (!latestSignature) return;

        if (!currentSignatureRef.current) {
          currentSignatureRef.current = latestSignature;
          return;
        }

        if (latestSignature !== currentSignatureRef.current) {
          if (!canReloadNow()) return;

          reloadingRef.current = true;
          markReloadNow();
          window.location.reload();
          return;
        }

        currentSignatureRef.current = latestSignature;
      } catch {
        // ignore network and parser failures
      } finally {
        checkingRef.current = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkForNewDeploy();
      }
    };

    const onFocus = () => {
      void checkForNewDeploy();
    };

    const onOnline = () => {
      void checkForNewDeploy();
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkForNewDeploy();
      }
    }, checkIntervalMs);

    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('pageshow', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    void checkForNewDeploy();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pageshow', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, checkIntervalMs]);
}
