import { useEffect, useMemo, useState } from 'react';
import UserApp from './app/components/UserApp';
import { useAuthSession } from './app/hooks/useAuthSession';
import { useDarkMode } from './app/hooks/useDarkMode';
import { useDeploymentRefresh } from './app/hooks/useDeploymentRefresh';
import PublicPortalRouter, { isPublicPortalPath } from './app/public/PublicPortalRouter';
import LoginScreen from './app/screens/LoginScreen';
import { formatPercent } from './app/utils/formatting';

function normalizeBootConnection(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const isOnline = source.isOnline !== false;
  const tier = String(source.connectionTier || '').trim() || (isOnline ? 'normal' : 'offline');
  const label =
    source.connectionLabel ||
    (isOnline
      ? tier === 'fast'
        ? 'اتصال سريع'
        : tier === 'medium'
        ? 'اتصال متوسط'
        : tier === 'slow'
        ? 'اتصال ضعيف'
        : 'الاتصال مستقر'
      : 'أوفلاين');

  return {
    isOnline,
    connectionTier: tier,
    connectionLabel: label,
    downlinkMbps: Number(source.downlinkMbps || 0),
    effectiveType: String(source.effectiveType || '').trim(),
    saveData: Boolean(source.saveData),
  };
}

function readRuntimeConnection() {
  if (typeof window === 'undefined') {
    return normalizeBootConnection();
  }

  const bootState = window.__TAREE2Y_BOOT__?.connection;
  if (bootState) return normalizeBootConnection(bootState);

  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const connection = nav?.connection || nav?.mozConnection || nav?.webkitConnection || null;

  return normalizeBootConnection({
    isOnline: typeof nav?.onLine === 'boolean' ? nav.onLine : true,
    effectiveType: connection?.effectiveType || '',
    downlinkMbps: Number(connection?.downlink || 0),
    saveData: Boolean(connection?.saveData),
  });
}

function getBootProgressConfig(connectionInfo) {
  if (!connectionInfo.isOnline) {
    return {
      initial: 18,
      cap: 44,
      tickMs: 180,
      step: 1.2,
      animationMs: 2200,
      hint: 'هنكمل تلقائيًا أول ما الاتصال يرجع.',
      footerLabel: 'بانتظار الاتصال',
    };
  }

  if (connectionInfo.connectionTier === 'slow') {
    return {
      initial: 24,
      cap: 74,
      tickMs: 180,
      step: 1.6,
      animationMs: 1900,
      hint: 'الشبكة أبطأ شوية، فبنجهز التطبيق بشكل تدريجي.',
      footerLabel: 'جاري التجهيز',
    };
  }

  if (connectionInfo.connectionTier === 'medium') {
    return {
      initial: 30,
      cap: 86,
      tickMs: 140,
      step: 2.2,
      animationMs: 1500,
      hint: 'بنجهز البيانات الأساسية دلوقتي.',
      footerLabel: 'جاري التجهيز',
    };
  }

  return {
    initial: 38,
    cap: 92,
    tickMs: 120,
    step: 3.4,
    animationMs: 1200,
    hint: 'لحظات ونفتح لك التطبيق.',
    footerLabel: 'جاري التجهيز',
  };
}

function readBootUiState() {
  if (typeof window === 'undefined') {
    return {
      routeLabel: 'تجهيز التطبيق',
      title: 'جاري تجهيز حسابك…',
      text: 'بنجهز الرصيد والتذاكر وآخر حالة لرحلاتك.',
      chips: ['الحجز', 'التذاكر', 'المحفظة'],
    };
  }

  const boot = window.__TAREE2Y_BOOT__ || {};
  return {
    routeLabel: String(boot.routeLabel || 'تجهيز التطبيق'),
    title: String(boot.routeTitle || 'جاري تجهيز حسابك…'),
    text: String(boot.routeText || 'بنجهز الرصيد والتذاكر وآخر حالة لرحلاتك.'),
    chips:
      Array.isArray(boot.chips) && boot.chips.length
        ? boot.chips.slice(0, 3)
        : ['الحجز', 'التذاكر', 'المحفظة'],
  };
}

function UnifiedBootScreen() {
  const bootUi = useMemo(() => readBootUiState(), []);
  const [connectionInfo, setConnectionInfo] = useState(readRuntimeConnection);
  const progressConfig = useMemo(
    () => getBootProgressConfig(connectionInfo),
    [connectionInfo],
  );
  const [progress, setProgress] = useState(progressConfig.initial);

  useEffect(() => {
    setProgress((currentValue) =>
      currentValue < progressConfig.initial ? progressConfig.initial : currentValue,
    );
  }, [progressConfig.initial]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncConnection = () => {
      setConnectionInfo(readRuntimeConnection());
    };

    const connection = navigator?.connection || navigator?.mozConnection || navigator?.webkitConnection || null;
    window.addEventListener('online', syncConnection);
    window.addEventListener('offline', syncConnection);
    connection?.addEventListener?.('change', syncConnection);

    return () => {
      window.removeEventListener('online', syncConnection);
      window.removeEventListener('offline', syncConnection);
      connection?.removeEventListener?.('change', syncConnection);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const intervalId = window.setInterval(() => {
      setProgress((currentValue) => {
        if (currentValue >= progressConfig.cap) return currentValue;
        const dynamicStep = Math.max(
          progressConfig.step,
          (progressConfig.cap - currentValue) * 0.08,
        );
        return Math.min(
          progressConfig.cap,
          Number((currentValue + dynamicStep).toFixed(1)),
        );
      });
    }, progressConfig.tickMs);

    return () => window.clearInterval(intervalId);
  }, [progressConfig.cap, progressConfig.step, progressConfig.tickMs]);

  return (
    <div className="boot-shell app-shell-bg" aria-live="polite" aria-busy="true">
      <div className="boot-card">
        <div className="boot-brand">
          <div className="boot-brand-top">
            <div className="boot-logo">ط</div>
            <div className="boot-brand-copy">
              <h1>طريقي</h1>
              <p>رحلات مصر بشكل أوضح وأسهل من أول خطوة.</p>
            </div>
          </div>
        </div>

        <div className="boot-body">
          <span className="boot-route">{bootUi.routeLabel}</span>

          <h2 className="boot-title">{bootUi.title}</h2>

          <p className="boot-text">{bootUi.text}</p>

          <div className="boot-progress" aria-hidden="true">
            <div className="boot-progress-head">
              <span>{progressConfig.footerLabel}</span>
              <span>{formatPercent(progress)}</span>
            </div>
            <div className="boot-progress-track">
              <div
                className="boot-progress-bar"
                style={{
                  width: `${Math.max(16, Math.min(progress, 96))}%`,
                  animationDuration: `${progressConfig.animationMs}ms`,
                }}
              />
            </div>
          </div>

          <div className="boot-chips">
            {bootUi.chips.map((chip, index) => (
              <span
                key={chip}
                className={`boot-chip ${index === 0 ? 'boot-chip--brand' : ''}`}
              >
                {chip}
              </span>
            ))}
            <span className="boot-chip">{connectionInfo.connectionLabel}</span>
          </div>

          <div className="boot-note">{progressConfig.hint}</div>

          <div className="boot-footer">
            <span className="inline-flex items-center gap-2">
              <span className="boot-pulse" />
              <span>{connectionInfo.connectionLabel}</span>
            </span>
            <span>{connectionInfo.isOnline ? 'بنجهز دخولك الآن' : 'بانتظار رجوع الاتصال'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
  const { session, profile, authLoading, authWarning, refreshProfile } = useAuthSession();
  const { isDark, setIsDark } = useDarkMode();

  useDeploymentRefresh({
    enabled: !import.meta.env.DEV,
    checkIntervalMs: 60000,
  });

  if (isPublicPortalPath(pathname)) {
    return <PublicPortalRouter />;
  }

  if (authLoading) {
    return <UnifiedBootScreen />;
  }

  if (!session || !profile) {
    return <LoginScreen isDark={isDark} setIsDark={setIsDark} />;
  }

  return (
    <div
      className={`app-shell-bg min-h-[100svh] w-full overflow-x-clip text-[var(--ink)] transition-colors duration-300 md:min-h-[100dvh] ${isDark ? 'dark' : ''}`}
      dir="rtl"
    >
      <div className="flex min-h-[100dvh] w-full">
        <UserApp
          userId={session.user.id}
          profile={profile}
          refreshProfile={refreshProfile}
          authWarning={authWarning}
          isDark={isDark}
          setIsDark={setIsDark}
        />
      </div>
    </div>
  );
}
