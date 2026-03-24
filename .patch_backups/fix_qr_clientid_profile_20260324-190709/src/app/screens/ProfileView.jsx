import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Crown,
  HelpCircle,
  LogOut,
  Mail,
  MapPin,
  Moon,
  Phone,
  Shield,
  Sun,
  UserRound,
} from 'lucide-react';
import {
  AppSurface,
  FieldShell,
  MetaChip,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
} from '../components/ui/AppPrimitives';
import { updateAccountPassword, updateProfileDetails } from '../../lib/account';

function buildForm(profile) {
  return {
    display_name: profile?.display_name || profile?.name || '',
    phone: profile?.phone || '',
    address_line1: profile?.address_line1 || '',
    address_line2: profile?.address_line2 || '',
    city: profile?.city || '',
    emergency_phone: profile?.emergency_phone || '',
  };
}

function ProfileView({
  user,
  profile,
  points,
  subscription,
  isDark,
  setIsDark,
  onLogout,
  refreshProfile,
  showToast,
  openModal,
  openGuide,
}) {
  const isGold = points >= 1000;
  const [form, setForm] = useState(() => buildForm(profile));
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    nextPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setForm(buildForm(profile));
  }, [profile]);

  const accountSummary = useMemo(
    () => ({
      name: form.display_name || user?.name || 'مستخدم',
      phone: form.phone || profile?.phone || '',
      email: profile?.email || '',
    }),
    [form.display_name, form.phone, profile?.email, profile?.phone, user?.name],
  );

  const updateField = (key, value) => {
    setForm((currentValue) => ({
      ...currentValue,
      [key]: value,
    }));
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) {
      showToast('تعذر حفظ البيانات حالياً.', 'error');
      return;
    }

    if (!String(form.display_name || '').trim()) {
      showToast('الاسم مطلوب.', 'error');
      return;
    }

    setSavingProfile(true);

    try {
      const { error } = await updateProfileDetails(profile.id, form);

      if (error) {
        showToast(error.message || 'تعذر حفظ البيانات حالياً.', 'error');
        return;
      }

      await refreshProfile?.();
      showToast('تم حفظ بيانات الحساب.', 'success');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    const nextPassword = String(passwordForm.nextPassword || '').trim();
    const confirmPassword = String(passwordForm.confirmPassword || '').trim();

    if (nextPassword.length < 6) {
      showToast('الباسورد الجديد لازم يبقى 6 حروف أو أكتر.', 'error');
      return;
    }

    if (nextPassword !== confirmPassword) {
      showToast('تأكيد الباسورد غير مطابق.', 'error');
      return;
    }

    setSavingPassword(true);

    try {
      const { error } = await updateAccountPassword(nextPassword);

      if (error) {
        showToast(error.message || 'تعذر تحديث الباسورد حالياً.', 'error');
        return;
      }

      setPasswordForm({ nextPassword: '', confirmPassword: '' });
      showToast('تم تحديث الباسورد بنجاح.', 'success');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="حسابي"
        title="حسابك ومزاياك في مكان واحد"
        subtitle="من هنا تراجع بياناتك، تعدّل الملف الشخصي، تغيّر الباسورد، وتدير الإعدادات بشكل منطقي."
      />

      {!profile?.onboarding_completed_at ? (
        <AppSurface className="p-5">
          <SectionHeader
            title="أول مرة تستخدم طريقي؟"
            subtitle="كمّل الدليل مرة واحدة عشان التطبيق يرتب لك البداية صح."
            action={<SecondaryButton onClick={openGuide}>افتح الدليل</SecondaryButton>}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <MetaChip label="Onboarding محتاج إكمال" tone="warning" />
            <MetaChip label="العروض الافتتاحية بتراجع من السيرفر" tone="brand" />
          </div>
        </AppSurface>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <AppSurface className="p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-20 w-20 place-items-center rounded-[28px] bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-3xl font-black text-white shadow-lg shadow-indigo-600/25">
              {(accountSummary.name || 'م').charAt(0)}
            </span>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{accountSummary.name}</h2>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400" dir="ltr">
                {accountSummary.phone || 'مفيش رقم موبايل مسجل'}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400" dir="ltr">
                {accountSummary.email || 'مفيش إيميل ظاهر'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <MetaChip label={isGold ? 'عضو ذهبي' : 'عضو أساسي'} tone={isGold ? 'warning' : 'brand'} />
                {subscription !== 'none' ? <MetaChip label={`باقة ${subscription === 'vip' ? 'VIP' : 'طالب'}`} tone="success" /> : null}
                {profile?.onboarding_completed_at ? <MetaChip label="اكتمل التعريف الأولي" tone="neutral" /> : null}
              </div>
            </div>
          </div>
        </AppSurface>

        <AppSurface className="p-6">
          <SectionHeader title="نقاط الولاء" subtitle="كل رحلة منتهية بتضيف نقاط حسب قيمة الحجز بعد الخصومات." />
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-black text-indigo-700 dark:text-indigo-300">{points}</p>
              <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">نقطة متاحة حاليًا</p>
            </div>
            <SecondaryButton onClick={() => openModal('points')} icon={<Award className="h-4 w-4" />}>
              إدارة النقاط
            </SecondaryButton>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#2156d9_0%,#0f9f8a_100%)]" style={{ width: `${Math.min(100, (points / 1000) * 100)}%` }} />
          </div>
          <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
            {isGold ? 'أنت وصلت للعضوية الذهبية بالفعل.' : `فاضلك ${Math.max(0, 1000 - points)} نقطة عشان توصل للذهبي.`}
          </p>
        </AppSurface>
      </div>

      <AppSurface className="p-5">
        <SectionHeader title="البيانات الأساسية" subtitle="البيانات دي بتستخدم في الحساب والتجربة والخصومات المرتبطة بالمستخدم." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <FieldShell label="الاسم" icon={<UserRound />}>
            <input
              type="text"
              value={form.display_name}
              onChange={(event) => updateField('display_name', event.target.value)}
              placeholder="اكتب الاسم اللي تحب يظهر"
              className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </FieldShell>

          <FieldShell label="رقم الموبايل" icon={<Phone />}>
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="01000000000"
              className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              dir="ltr"
            />
          </FieldShell>

          <FieldShell label="العنوان الأساسي" icon={<MapPin />}>
            <input
              type="text"
              value={form.address_line1}
              onChange={(event) => updateField('address_line1', event.target.value)}
              placeholder="مثال: مدينة نصر، الحي السابع"
              className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </FieldShell>

          <FieldShell label="تفاصيل إضافية للعنوان" icon={<MapPin />}>
            <input
              type="text"
              value={form.address_line2}
              onChange={(event) => updateField('address_line2', event.target.value)}
              placeholder="عمارة، شقة، علامة مميزة"
              className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </FieldShell>

          <FieldShell label="المدينة" icon={<MapPin />}>
            <input
              type="text"
              value={form.city}
              onChange={(event) => updateField('city', event.target.value)}
              placeholder="القاهرة"
              className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </FieldShell>

          <FieldShell label="رقم للطوارئ أو بديل" icon={<Phone />}>
            <input
              type="tel"
              value={form.emergency_phone}
              onChange={(event) => updateField('emergency_phone', event.target.value)}
              placeholder="اختياري"
              className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              dir="ltr"
            />
          </FieldShell>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={() => setForm(buildForm(profile))}>إرجاع القيم الحالية</SecondaryButton>
          <PrimaryButton onClick={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? 'جاري الحفظ…' : 'حفظ البيانات'}
          </PrimaryButton>
        </div>
      </AppSurface>

      <AppSurface className="p-5">
        <SectionHeader title="الأمان" subtitle="تقدر تغير الباسورد من هنا من غير ما تخرج من الحساب." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <FieldShell label="الإيميل الحالي" icon={<Mail />}>
            <input
              type="email"
              value={profile?.email || ''}
              readOnly
              className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-100 px-4 pr-12 text-base font-black text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              dir="ltr"
            />
          </FieldShell>

          <div className="hidden md:block" />

          <FieldShell label="باسورد جديد" icon={<Shield />}>
            <input
              type="password"
              value={passwordForm.nextPassword}
              onChange={(event) =>
                setPasswordForm((currentValue) => ({
                  ...currentValue,
                  nextPassword: event.target.value,
                }))
              }
              placeholder="6 حروف أو أكتر"
              className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              dir="ltr"
            />
          </FieldShell>

          <FieldShell label="تأكيد الباسورد" icon={<Shield />}>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                setPasswordForm((currentValue) => ({
                  ...currentValue,
                  confirmPassword: event.target.value,
                }))
              }
              placeholder="أعد كتابة الباسورد"
              className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              dir="ltr"
            />
          </FieldShell>
        </div>

        <div className="mt-5 flex justify-end">
          <PrimaryButton onClick={handlePasswordChange} disabled={savingPassword}>
            {savingPassword ? 'جاري التحديث…' : 'تحديث الباسورد'}
          </PrimaryButton>
        </div>
      </AppSurface>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button type="button" onClick={() => openModal('subs')} className="rounded-[28px] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
          <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
            <Crown className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">باقات التوفير</h3>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">فعّل باقة ووفّر على كل رحلة جاية.</p>
        </button>

        <button type="button" onClick={() => openModal('help')} className="rounded-[28px] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
          <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
            <HelpCircle className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">مركز المساعدة</h3>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">شرح الحجز، التتبع، والمحفظة بشكل مباشر وواضح.</p>
        </button>

        <button type="button" onClick={openGuide} className="rounded-[28px] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
          <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            <BookOpen className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">دليل الاستخدام</h3>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">افتح الشرح السريع في أي وقت لو عايز تراجع الخطوات.</p>
        </button>

        <button type="button" onClick={() => setIsDark((currentValue) => !currentValue)} className="rounded-[28px] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
          <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {isDark ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
          </span>
          <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">شكل التطبيق</h3>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{isDark ? 'الوضع الليلي مفعل حالياً.' : 'فعّل الوضع الليلي لو تحب واجهة أهدى.'}</p>
        </button>
      </div>

      <PrimaryButton onClick={onLogout} icon={<LogOut className="h-5 w-5" />} className="w-full bg-rose-600 hover:bg-rose-700 shadow-rose-600/25 md:max-w-sm">
        تسجيل الخروج
      </PrimaryButton>
    </div>
  );
}

export default ProfileView;
