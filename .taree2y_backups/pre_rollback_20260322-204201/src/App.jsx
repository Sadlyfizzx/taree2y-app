import UserApp from './app/components/UserApp';
import { AppLogo } from './app/components/ui/Taree2yUI';
import { useAuthSession } from './app/hooks/useAuthSession';
import { useDarkMode } from './app/hooks/useDarkMode';
import LoginScreen from './app/screens/LoginScreen';

export default function App() {
  const { session, profile, authLoading } = useAuthSession();
  const { isDark, setIsDark } = useDarkMode();

  if (authLoading) {
    return (
      <div className={`${isDark ? 'dark' : ''}`} dir="rtl">
        <div className="min-h-screen bg-transparent px-5 py-6">
          <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center">
            <div className="w-full rounded-[34px] border border-white/60 bg-white/85 p-8 text-center shadow-[0_40px_100px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85 dark:shadow-none">
              <div className="mx-auto mb-6 flex w-max items-center justify-center">
                <AppLogo />
              </div>
              <div className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin dark:border-indigo-500/20 dark:border-t-indigo-400" />
              <p className="text-base font-black text-slate-800 dark:text-slate-100">
                جاري تحميل حسابك وتجهيز رحلاتك...
              </p>
              <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                لحظات بسيطة ونرجعك لطريقي.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginScreen isDark={isDark} setIsDark={setIsDark} />;
  }

  return (
    <div className={`${isDark ? 'dark' : ''}`} dir="rtl">
      <div className="min-h-[100dvh] bg-transparent px-0 md:px-4 md:py-4 xl:px-6 xl:py-5">
        <div className="mx-auto flex min-h-[100dvh] max-w-[1850px] items-stretch justify-center">
          <div className="taree2y-app-shell relative flex min-h-[100dvh] w-full overflow-hidden md:min-h-[calc(100dvh-2rem)] md:rounded-[36px]">
            <div className="pointer-events-none absolute inset-0 bg-grid-eg opacity-50" />
            <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-indigo-500/12 blur-3xl dark:bg-indigo-500/10" />
            <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/10" />
            <UserApp
              userId={session.user.id}
              profile={profile}
              isDark={isDark}
              setIsDark={setIsDark}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
