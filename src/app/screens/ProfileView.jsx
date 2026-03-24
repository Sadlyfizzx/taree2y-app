import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Bot,
  BookOpen,
  Crown,
  Languages,
  LogOut,
  Moon,
  Phone,
  Save,
  Sun,
  User,
  KeyRound,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  AppSurface,
  MetaChip,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
} from '../components/ui/AppPrimitives';

function ProfileView({
  user,
  points,
  subscription,
  isDark,
  setIsDark,
  onLogout,
  showToast,
  openModal,
  openGuide,
}) {
  const isGold = points >= 1000;

  const [displayName, setDisplayName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setDisplayName(user?.name || '');
    setPhone(user?.phone || '');
  }, [user?.name, user?.phone]);

  const initial = useMemo(
    () => ({
      displayName: user?.name || '',
      phone: user?.phone || '',
    }),
    [user?.name, user?.phone],
  );

  const hasProfileChanges =
    displayName.trim() !== initial.displayName.trim() ||
    phone.trim() !== initial.phone.trim();

  const saveProfile = async () => {
    if (!displayName.trim()) {
      showToast('اكتب الاسم الأول.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const authUser = authData?.user;
      if (!authUser?.id) {
        throw new Error('لا يوجد مستخدم مسجل حالياً.');
      }

      const payload = {
        id: authUser.id,
        display_name: displayName.trim(),
        phone: phone.trim() || null,
      };

      const { error: profileError } = await supabase.from('profiles').upsert(payload);
      if (profileError) throw profileError;

      const { error: updateUserError } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          phone: phone.trim() || null,
        },
      });

      if (updateUserError) throw updateUserError;

      showToast('تم تحديث بيانات الحساب.', 'success');
    } catch (error) {
      showToast(error?.message || 'تعذر تحديث بيانات الحساب حالياً.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      showToast('الباسورد الجديد لازم يبقى 6 حروف أو أكتر.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('تأكيد الباسورد غير مطابق.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      showToast('تم تغيير الباسورد بنجاح.', 'success');
    } catch (error) {
      showToast(error?.message || 'تعذر تغيير الباسورد حالياً.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="حسابي"
        title="إعداداتك ومزاياك في مكان واحد"
        subtitle="من هنا تراجع بياناتك الأساسية، تغيّر الباسورد، وتوصل سريعًا للمزايا والمساعدة."
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <AppSurface className="p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-20 w-20 place-items-center rounded-[28px] bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-3xl font-black text-white shadow-lg shadow-indigo-600/25">
              {(displayName || user?.name || 'م').charAt(0)}
            </span>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {displayName || user?.name || 'مستخدم'}
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400" dir="ltr">
                {phone || 'مفيش رقم موبايل مسجل'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <MetaChip label={isGold ? 'عضو ذهبي' : 'عضو أساسي'} tone={isGold ? 'warning' : 'brand'} />
                {subscription !== 'none' ? (
                  <MetaChip label={`باقة ${subscription === 'vip' ? 'VIP' : 'طالب'}`} tone="success" />
                ) : null}
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

      <div className="grid gap-5 xl:grid-cols-2">
        <AppSurface className="p-6">
          <SectionHeader title="البيانات الأساسية" subtitle="عدّل الاسم ورقم الموبايل فقط." />
          <div className="mt-5 grid gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-black text-slate-800 dark:text-slate-200">الاسم</span>
              <div className="relative">
                <User className="pointer-events-none absolute inset-y-0 right-4 my-auto h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="اكتب اسمك"
                  className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-black text-slate-800 dark:text-slate-200">رقم الموبايل</span>
              <div className="relative">
                <Phone className="pointer-events-none absolute inset-y-0 right-4 my-auto h-5 w-5 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="مثال: 01000000000"
                  dir="ltr"
                  className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </label>

            <PrimaryButton onClick={saveProfile} disabled={!hasProfileChanges || savingProfile} icon={<Save className="h-5 w-5" />}>
              {savingProfile ? 'جاري الحفظ…' : 'حفظ البيانات'}
            </PrimaryButton>
          </div>
        </AppSurface>

        <AppSurface className="p-6">
          <SectionHeader title="تغيير الباسورد" subtitle="حدّث كلمة المرور من هنا." />
          <div className="mt-5 grid gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-black text-slate-800 dark:text-slate-200">الباسورد الجديد</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute inset-y-0 right-4 my-auto h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="6 حروف أو أكتر"
                  dir="ltr"
                  className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-black text-slate-800 dark:text-slate-200">تأكيد الباسورد</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute inset-y-0 right-4 my-auto h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="أعد كتابة الباسورد"
                  dir="ltr"
                  className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </label>

            <PrimaryButton onClick={changePassword} disabled={savingPassword} icon={<KeyRound className="h-5 w-5" />}>
              {savingPassword ? 'جاري التحديث…' : 'تغيير الباسورد'}
            </PrimaryButton>
          </div>
        </AppSurface>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button type="button" onClick={() => openModal('subs')} className="rounded-[28px] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
          <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
            <Crown className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">باقات التوفير</h3>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">فعّل باقة ووفّر على كل رحلة جاية.</p>
        </button>

        <button type="button" onClick={() => openModal('bot')} className="rounded-[28px] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
          <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
            <Bot className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">الدعم والمساعدة</h3>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">اسأل عن الإلغاء، التتبع، أو العروض في ثواني.</p>
        </button>

        <button type="button" onClick={openGuide} className="rounded-[28px] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
          <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            <BookOpen className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">دليل الاستخدام</h3>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">افتح الشرح السريع في أي وقت لو عايز تراجع الخطوات.</p>
        </button>

        <button type="button" onClick={() => showToast('اللغة الحالية هي العربي المصري فقط.', 'success')} className="rounded-[28px] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
          <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Languages className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">لغة التطبيق</h3>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">النسخة الحالية معمولة بالكامل بالمصري وبتخدم RTL.</p>
        </button>
      </div>

      <AppSurface className="p-5">
        <SectionHeader title="إعدادات العرض" subtitle="اختار الشكل الأنسب ليك أثناء الاستخدام." />
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">الوضع الليلي</p>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">ينفع في السفر بالليل أو لو بتحب الواجهة الهادية.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsDark((currentValue) => !currentValue)}
            className={`flex min-h-12 min-w-[140px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-all ${
              isDark
                ? 'border-indigo-700 bg-indigo-900/30 text-indigo-200'
                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {isDark ? 'مفعل حالياً' : 'تفعيل الوضع الليلي'}
          </button>
        </div>
      </AppSurface>

      <PrimaryButton onClick={onLogout} icon={<LogOut className="h-5 w-5" />} className="w-full bg-rose-600 hover:bg-rose-700 shadow-rose-600/25 md:max-w-sm">
        تسجيل الخروج
      </PrimaryButton>
    </div>
  );
}

export default ProfileView;
