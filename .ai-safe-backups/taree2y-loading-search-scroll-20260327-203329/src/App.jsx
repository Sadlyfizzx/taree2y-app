import UserApp from './app/components/UserApp';
import { useAuthSession } from './app/hooks/useAuthSession';
import { useDarkMode } from './app/hooks/useDarkMode';
import { useDeploymentRefresh } from './app/hooks/useDeploymentRefresh';
import PublicPortalRouter, { isPublicPortalPath } from './app/public/PublicPortalRouter';
import LoginScreen from './app/screens/LoginScreen';

function UnifiedBootScreen({ text }) {
  return (
    <div className="boot-shell app-shell-bg" aria-live="polite">
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
          <span className="boot-route">تجهيز التطبيق</span>

          <h2 className="boot-title">{text}</h2>

          <p className="boot-text">
            بنحمّل الحساب، المحفظة، التذاكر، والإعدادات بنفس منطق الشاشة الأولى من غير ما تحس إن فيه لودينج تاني مختلف.
          </p>

          <div className="boot-progress" aria-hidden="true">
            <div className="boot-progress-head">
              <span>تجهيز الواجهة</span>
              <span>طريقي</span>
            </div>
            <div className="boot-progress-track">
              <div className="boot-progress-bar"></div>
            </div>
          </div>

          <div className="boot-chips">
            <span className="boot-chip boot-chip--brand">الحجز</span>
            <span className="boot-chip">التذاكر</span>
            <span className="boot-chip">المحفظة</span>
          </div>

          <div className="boot-note">
            تجربة تحميل موحدة بدل إحساس الانتقال بين شاشتين مختلفتين قبل دخول التطبيق.
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
    return <UnifiedBootScreen text="جاري تحميل الحساب والتجربة الأساسية…" />;
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
