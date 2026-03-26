import UserApp from './app/components/UserApp';
import { useAuthSession } from './app/hooks/useAuthSession';
import { useDarkMode } from './app/hooks/useDarkMode';
import { useDeploymentRefresh } from './app/hooks/useDeploymentRefresh';
import PublicPortalRouter, { isPublicPortalPath } from './app/public/PublicPortalRouter';
import LoginScreen from './app/screens/LoginScreen';

function SplashScreen({ text }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg)] px-4 text-[var(--text-primary)]">
      <div className="app-surface rounded-[32px] px-6 py-8 text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-2xl bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)]" />
        <p className="text-base font-black text-slate-900 dark:text-white">{text}</p>
        <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">طريقي بيجهز التجربة المناسبة ليك.</p>
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
    <div className="min-h-[100dvh] w-full bg-[var(--bg)] text-[var(--text-primary)] transition-colors duration-300" dir="rtl">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1800px] overflow-hidden">
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
