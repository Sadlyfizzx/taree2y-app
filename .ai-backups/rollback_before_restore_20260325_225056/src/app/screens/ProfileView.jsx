import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Crown,
  KeyRound,
  LogOut,
  Moon,
  Phone,
  Save,
  Sun,
  Trash2,
  User,
} from 'lucide-react';
import { updateAccountPassword } from '../../lib/account';
import {
  getFriendlyAuthError,
  requestCurrentUserDeletion,
  updateCurrentUserProfile,
} from '../../lib/auth';
import { createLogger } from '../../lib/logger';
import ReferralCard from '../components/ui/ReferralCard';
import ModalShell from '../components/ui/ModalShell';
import {
  AppSurface,
  MetaChip,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
} from '../components/ui/AppPrimitives';

const log = createLogger('profile-view');

function ProfileView({
  user,
  profile,
  points,
  subscription,
  isDark,
  setIsDark,
  refreshProfile,
  onLogout,
  showToast,
  openModal,
  openGuide,
  referralSummary,
  refreshReferralSummary,
  applyReferralCode,
}) {
  const [displayName, setDisplayName] = useState(profile?.display_name || user?.name || '');
  const [phone, setPhone] = useState(profile?.phone || user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name || user?.name || '');
    setPhone(profile?.phone || user?.phone || '');
  }, [profile?.display_name, profile?.phone, user?.name, user?.phone]);

  const initial = useMemo(
    () => ({
      displayName: profile?.display_name || user?.name || '',
      phone: profile?.phone || user?.phone || '',
    }),
    [profile?.display_name, profile?.phone, user?.name, user?.phone],
  );

  const hasProfileChanges = displayName.trim() !== initial.displayName.trim() || phone.trim() !== initial.phone.trim();

  const saveProfile = async () => {
    if (savingProfile) return;
    if (!displayName.trim()) {
      showToast('اكتب الاسم الأول.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      await updateCurrentUserProfile({ displayName, phone });
      await refreshProfile?.();
      showToast('تم تحديث بيانات الحساب.', 'success');
    } catch (error) {
      log.error('profile_update_failed', { error });
      showToast(getFriendlyAuthError(error, 'profile'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (savingPassword) return;
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
      const { error } = await updateAccountPassword(newPassword);
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      showToast('تم تغيير الباسورد بنجاح.', 'success');
    } catch (error) {
      log.error('password_change_failed', { error });
      showToast(getFriendlyAuthError(error, 'password'), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const result = await onLogout?.();
      if (result?.ok === false) throw result.error || new Error('logout_failed');
    } catch (error) {
      log.error('logout_failed', { error });
      showToast(getFriendlyAuthError(error, 'logout'), 'error');
    } finally {
      setLoggingOut(false);
    }
  };

  const deleteAccount = async () => {
    if (deletingAccount) return;
    if (deleteConfirmText.trim() !== 'حذف') {
      showToast('اكتب كلمة "حذف" لتأكيد العملية.', 'error');
      return;
    }

    setDeletingAccount(true);
    try {
      await requestCurrentUserDeletion();
      setIsDeleteOpen(false);
      setDeleteConfirmText('');
    } catch (error) {
      log.error('account_delete_failed', { error });
      showToast(getFriendlyAuthError(error, 'delete_account'), 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  const subscriptionLabel = subscription === 'vip' ? 'VIP' : subscription === 'student' ? 'طالب' : 'غير مفعلة';

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="حسابي"
        title="إعدادات الحساب"
        subtitle="راجع بياناتك، عدّل كلمة المرور، وافتح المزايا أو المساعدة من مكان واحد منظم."
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <AppSurface className="p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-20 w-20 place-items-center rounded-[28px] bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-3xl font-black text-white shadow-lg shadow-indigo-600/25">
              {(displayName || profile?.display_name || user?.name || 'م').charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {displayName || profile?.display_name || user?.name || 'مستخدم'}
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400" dir="ltr">
                {phone || 'مفيش رقم موبايل مسجل'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <MetaChip label={`${Number(points || 0)} نقطة`} tone="brand" />
                <MetaChip label={`الباقة: ${subscriptionLabel}`} tone={subscription === 'none' ? 'neutral' : 'success'} />
              </div>
            </div>
          </div>
        </AppSurface>

        <AppSurface className="p-6">
          <SectionHeader title="إعدادات العرض" subtitle="اختار الوضع الأنسب لك أثناء الاستخدام." />
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">الوضع الليلي</p>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">بدّل بين الوضع الفاتح والداكن وقت ما تحب.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsDark((currentValue) => !currentValue)}
              className={`inline-flex min-h-12 min-w-[148px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-all ${
                isDark
                  ? 'border-indigo-700 bg-indigo-900/30 text-indigo-200'
                  : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDark ? 'إيقاف الوضع الليلي' : 'تشغيل الوضع الليلي'}
            </button>
          </div>
        </AppSurface>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <AppSurface className="p-6">
          <SectionHeader title="بيانات الحساب" subtitle="حدّث اسمك ورقم الموبايل لو احتجت." />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-black text-slate-900 dark:text-white">الاسم</span>
              <div className="relative">
                <User className="pointer-events-none absolute inset-y-0 right-4 my-auto h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="h-14 w-full rounded-[22px] border border-slate-200 bg-[var(--panel)] px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-[var(--panel)] dark:text-white"
                  placeholder="اكتب الاسم اللي تحب يظهر"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-black text-slate-900 dark:text-white">رقم الموبايل</span>
              <div className="relative">
                <Phone className="pointer-events-none absolute inset-y-0 right-4 my-auto h-5 w-5 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="h-14 w-full rounded-[22px] border border-slate-200 bg-[var(--panel)] px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-[var(--panel)] dark:text-white"
                  placeholder="مثال: 01000000000"
                  dir="ltr"
                />
              </div>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <PrimaryButton onClick={saveProfile} disabled={!hasProfileChanges} loading={savingProfile} loadingText="جاري الحفظ…" icon={<Save className="h-4 w-4" />}>
              حفظ التغييرات
            </PrimaryButton>
          </div>
        </AppSurface>

        <AppSurface className="p-6">
          <SectionHeader title="تغيير كلمة المرور" subtitle="اختار كلمة مرور جديدة لو محتاج." />
          <div className="mt-5 space-y-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-black text-slate-900 dark:text-white">كلمة المرور الجديدة</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute inset-y-0 right-4 my-auto h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-14 w-full rounded-[22px] border border-slate-200 bg-[var(--panel)] px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-[var(--panel)] dark:text-white"
                  placeholder="6 حروف أو أكتر"
                />
              </div>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-black text-slate-900 dark:text-white">تأكيد كلمة المرور</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute inset-y-0 right-4 my-auto h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-14 w-full rounded-[22px] border border-slate-200 bg-[var(--panel)] px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-[var(--panel)] dark:text-white"
                  placeholder="اكتبها مرة تانية"
                />
              </div>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <PrimaryButton onClick={changePassword} loading={savingPassword} loadingText="جاري التحديث…" icon={<KeyRound className="h-4 w-4" />}>
              تغيير كلمة المرور
            </PrimaryButton>
          </div>
        </AppSurface>
      </div>

      <ReferralCard
        summary={referralSummary}
        onApplyCode={applyReferralCode}
        onRefresh={refreshReferralSummary}
        showToast={showToast}
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <AppSurface className="p-6">
          <SectionHeader title="المساعدة والمزايا" subtitle="افتح المساعدة أو الباقات من هنا وقت ما تحتاج." />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-base font-black text-slate-900 dark:text-white">مركز المساعدة</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">شرح الحجز، التذكرة، والمحفظة بلغة بسيطة وواضحة.</p>
              <div className="mt-4">
                <SecondaryButton onClick={() => openModal?.('help')} icon={<BookOpen className="h-4 w-4" />}>افتح المساعدة</SecondaryButton>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-base font-black text-slate-900 dark:text-white">باقات التوفير</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">لو بتسافر كثير، الباقات هتوفّر عليك في الرحلات الجاية.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <SecondaryButton onClick={() => openModal?.('subs')} icon={<Crown className="h-4 w-4" />}>افتح الباقات</SecondaryButton>
                <SecondaryButton onClick={openGuide} icon={<BookOpen className="h-4 w-4" />}>افتح الدليل</SecondaryButton>
              </div>
            </div>
          </div>
        </AppSurface>

        <AppSurface className="p-6">
          <SectionHeader title="الأمان وتسجيل الخروج" subtitle="لو حبيت تسجل خروج أو توقف الحساب من التطبيق." />
          <div className="mt-5 space-y-4">
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 dark:border-rose-900/40 dark:bg-rose-900/10">
              <p className="text-sm font-black text-rose-800 dark:text-rose-200">حذف الحساب من التطبيق</p>
              <p className="mt-2 text-sm font-bold leading-6 text-rose-700 dark:text-rose-200/85">
                لو أكدت الحذف، الحساب هيتعطل داخل التطبيق ويتعمل تسجيل خروج آمن.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <SecondaryButton onClick={() => setIsDeleteOpen(true)} icon={<Trash2 className="h-4 w-4" />} className="border-rose-300 text-rose-700 hover:border-rose-400 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/20">
                حذف الحساب
              </SecondaryButton>
              <PrimaryButton onClick={handleLogout} disabled={loggingOut} icon={<LogOut className="h-4 w-4" />} className="bg-rose-600 hover:bg-rose-700 shadow-rose-600/25">
                {loggingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}
              </PrimaryButton>
            </div>
          </div>
        </AppSurface>
      </div>

      {isDeleteOpen ? (
        <ModalShell
          onClose={() => {
            if (deletingAccount) return;
            setIsDeleteOpen(false);
            setDeleteConfirmText('');
          }}
          title="تأكيد حذف الحساب"
          subtitle='اكتب كلمة "حذف" لتأكيد العملية.'
          icon={<AlertTriangle className="h-6 w-6" />}
          maxWidth="max-w-lg"
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <SecondaryButton
                onClick={() => {
                  if (deletingAccount) return;
                  setIsDeleteOpen(false);
                  setDeleteConfirmText('');
                }}
              >
                رجوع
              </SecondaryButton>
              <PrimaryButton onClick={deleteAccount} disabled={deleteConfirmText.trim() !== 'حذف'} loading={deletingAccount} loadingText="جاري الحذف…" className="bg-rose-600 hover:bg-rose-700 shadow-rose-600/25">
                تأكيد الحذف
              </PrimaryButton>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 dark:border-rose-900/40 dark:bg-rose-900/10">
              <p className="text-sm font-black text-rose-800 dark:text-rose-200">تنبيه مهم</p>
              <p className="mt-2 text-sm font-bold leading-6 text-rose-700 dark:text-rose-200/85">
                بعد التأكيد، الحساب هيتوقف داخل التطبيق فورًا وهيتم تسجيل خروجك.
              </p>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-black text-slate-900 dark:text-white">اكتب كلمة حذف</span>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                className="h-14 rounded-[22px] border border-slate-200 bg-[var(--panel)] px-4 text-base font-black text-slate-900 outline-none transition focus:border-rose-500 dark:border-slate-700 dark:bg-[var(--panel)] dark:text-white"
                placeholder='اكتب "حذف"'
              />
            </label>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

export default ProfileView;
