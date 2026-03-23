import {
  Award,
  CheckCircle2,
  ChevronRight,
  Crown,
  Languages,
  LogOut,
  Moon,
} from 'lucide-react';
import { GlassCard, ScreenHeader, SoftBadge } from '../components/ui/Taree2yUI';

function ProfileView({ user, points, subscription, isDark, setIsDark, onLogout, showToast, openModal }) {
  const isGold = points >= 1000;

  const settings = [
    {
      icon: Crown,
      title: 'باقات التوفير',
      action: () => openModal('subs'),
      tag:
        subscription !== 'none' ? (
          <SoftBadge tone="emerald" text="باقة مفعلة" />
        ) : (
          <ChevronRight className="h-5 w-5 rotate-180 text-slate-400" />
        ),
      tone: 'bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300',
    },
    {
      icon: Moon,
      title: 'الوضع الليلي',
      action: () => setIsDark(!isDark),
      tag: (
        <div className={`relative h-7 w-14 rounded-full transition ${isDark ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
          <div
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${
              isDark ? 'right-0.5' : 'right-[calc(100%-1.75rem)]'
            }`}
          />
        </div>
      ),
      tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      icon: Languages,
      title: 'لغة التطبيق',
      action: () => showToast('اللغة الإنجليزية هتنزل في التحديث اللي جاي 🔜', 'success'),
      tag: <SoftBadge tone="indigo" text="عربي 🇪🇬" />,
      tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    },
  ];

  return (
    <div className="space-y-5 pb-4">
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard className="p-6 md:p-7">
          <ScreenHeader
            eyebrow="الملف الشخصي"
            title="بياناتك على طريقي"
            description="هنا بتدير حسابك ونقاطك وباقاتك وإعدادات التطبيق."
          />

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-tr from-indigo-500 to-violet-600 text-4xl font-black text-white shadow-[0_22px_48px_-24px_rgba(79,70,229,0.82)]">
              {user.name.charAt(0)}
            </div>

            <div className="min-w-0">
              <div className="text-2xl font-black text-slate-900 dark:text-white">{user.name}</div>
              <div className="mt-2 text-sm font-black text-slate-400" dir="ltr">
                {user.phone || '—'}
              </div>
              <div className="mt-3">
                {isGold ? (
                  <SoftBadge tone="amber" icon={<Crown className="h-3.5 w-3.5" />} text="عضو ذهبي" />
                ) : (
                  <SoftBadge tone="indigo" icon={<CheckCircle2 className="h-3.5 w-3.5" />} text="عضو أساسي" />
                )}
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 md:p-7">
          <ScreenHeader
            eyebrow="نظام الولاء"
            title="نقاط طريقي"
            description="اجمع نقاط من رحلاتك وبدّلها رصيد أو وصل لمستوى العضو الذهبي."
            actions={<SoftBadge tone="indigo" text={`${points} نقطة`} />}
          />

          <button
            onClick={() => openModal('points')}
            className="mt-6 block w-full rounded-[30px] border border-slate-200 bg-slate-50 p-5 text-right transition hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-indigo-500/20"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-900 dark:text-white">رصيد النقاط الحالي</div>
                <div className="mt-2 text-4xl font-black text-indigo-600 dark:text-indigo-300" dir="ltr">
                  {points}
                </div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <Award className="h-7 w-7" />
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500 dark:text-slate-400">
                <span>التقدم نحو العضو الذهبي</span>
                <span>{Math.max(0, 1000 - points)} نقطة متبقية</span>
              </div>
              <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600"
                  style={{ width: `${Math.min(100, (points / 1000) * 100)}%` }}
                />
              </div>
            </div>
          </button>
        </GlassCard>
      </div>

      <GlassCard className="p-5 md:p-6">
        <ScreenHeader
          eyebrow="إعدادات التطبيق"
          title="تحكم في التجربة"
          description="إعدادات بسيطة وسريعة من غير ما تسيب التطبيق."
        />

        <div className="mt-5 space-y-3">
          {settings.map((item) => (
            <button
              key={item.title}
              onClick={item.action}
              className="flex w-full items-center justify-between gap-4 rounded-[26px] border border-slate-200 bg-white p-4 text-right transition hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-indigo-500/20"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${item.tone}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">{item.title}</div>
              </div>
              {item.tag}
            </button>
          ))}
        </div>
      </GlassCard>

      <button
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-black text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
      >
        <LogOut className="h-4 w-4" />
        تسجيل الخروج
      </button>
    </div>
  );
}

export default ProfileView;
