import UserApp from './app/components/UserApp';
import { useAuthSession } from './app/hooks/useAuthSession';
import { useDarkMode } from './app/hooks/useDarkMode';
import LoginScreen from './app/screens/LoginScreen';

export default function App() {
  const { session, profile, authLoading } = useAuthSession();
  const { isDark, setIsDark } = useDarkMode();

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-white">
        جاري تحميل الحساب...
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginScreen isDark={isDark} setIsDark={setIsDark} />;
  }

  return (
    <div
      className={`min-h-[100dvh] font-sans transition-colors duration-300 flex justify-center w-full ${
        isDark ? 'dark bg-slate-900 text-slate-50' : 'bg-slate-200 text-slate-900'
      }`}
      dir="rtl"
    >
      <div className="w-full bg-white dark:bg-slate-950 shadow-2xl relative flex flex-col md:flex-row h-[100dvh] overflow-hidden">
        <UserApp userId={session.user.id} profile={profile} isDark={isDark} setIsDark={setIsDark} />
      </div>
    </div>
  );
}
