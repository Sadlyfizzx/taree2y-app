import UserApp from './app/components/UserApp';
import { useAuthSession } from './app/hooks/useAuthSession';
import { useDarkMode } from './app/hooks/useDarkMode';
import { useDeploymentRefresh } from './app/hooks/useDeploymentRefresh';
import PublicPortalRouter, { isPublicPortalPath } from './app/public/PublicPortalRouter';
import LoginScreen from './app/screens/LoginScreen';

function SplashScreen({ text }) {
  return (
    <div className="app-shell-bg grid min-h-screen place-items-center px-4">
      <div className="app-surface app-surface-strong w-full max-w-md rounded-[34px] px-6 py-8 text-center">
        <div className="app-brand-panel mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[20px]" />
        <p className="text-base font-black text-[var(--ink)]">{text}</p>
        <p className="mt-2 text-sm font-bold text-[var(--ink-muted)]">
          بنجهز البيانات والحالة الحالية قبل ما تكمّل.
        </p>
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
    return <SplashScreen text="جاري تحميل الحساب…" />;
  }

  if (!session || !profile) {
    return <LoginScreen isDark={isDark} setIsDark={setIsDark} />;
  }

  return (
    <div className={`app-shell-bg min-h-[100svh] w-full overflow-x-clip text-[var(--ink)] transition-colors duration-300 md:min-h-[100dvh] ${isDark ? 'dark' : ''}`} dir="rtl">
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
