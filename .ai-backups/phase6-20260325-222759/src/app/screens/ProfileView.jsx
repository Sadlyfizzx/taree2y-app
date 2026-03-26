import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
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
  PageHeading,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
} from '../components/ui/AppPrimitives';

const log = createLogger('profile-view');

export default function ProfileView({
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

  const isProfileDirty = displayName.trim() !== initial.displayName.trim() || phone.trim() !== initial.phone.trim();
  const hasPasswordValues = newPassword.trim() || confirmPassword.trim();

  const handleSaveProfile = async () => {
    if (!isProfileDirty || savingProfile) return;
    setSavingProfile(true);
    try {
      const result = await updateCurrentUserProfile({
        displayName: displayName.trim(),
        phone: phone.trim(),
      });

      if (!result?.ok) {
        showToast(getFriendlyAuthError(result?.error || result?.message || 'تعذر تحديث البيانات.'), 'error');
        return;
      }

      await refreshProfile?.({ silent: true });
      showToast('تم تحديث بيانات الحساب.', 'success');
    } catch (error) {
      log.error('profile_save_failed', { error });
      showToast(getFriendlyAuthError(error?.message || 'تعذر تحديث البيانات.'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (savingPassword) return;
    if (!newPassword.trim() || newPassword.length < 6) {
      showToast('الباسورد لازم يبقى 6 حروف أو أكتر.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('تأكيد الباسورد غير مطابق.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      const result = await updateAccountPassword(newPassword);
      if (!result?.ok) {
        showToast(getFriendlyAuthError(result?.error || result?.message || 'تعذر تحديث الباسورد.'), 'error');
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      showToast('تم تغيير الباسورد بنجاح.', 'success');
    } catch (error) {
      log.error('password_change_failed', { error });
      showToast(getFriendlyAuthError(error?.message || 'تعذر تحديث الباسورد.'), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const deleteAccount = async () => {
    if (deletingAccount || deleteConfirmText.trim() !== 'حذف') return;
    setDeletingAccount(true);
    try {
      const result = await requestCurrentUserDeletion();
      if (!result?.ok) {
        showToast(getFriendlyAuthError(result?.error || result?.message || 'تعذر تنفيذ حذف الحساب.'), 'error');
        return;
      }
      showToast('تم تعطيل الحساب وتسجيل خروجك من التطبيق.', 'success');
      const logoutResult = await onLogout?.();
      if (!logoutResult?.ok) {
        showToast('تم تعطيل الحساب، لكن حصلت مشكلة بسيطة أثناء تسجيل الخروج.', 'warning');
      }
    } catch (error) {
      log.error('account_delete_failed', { error });
      showToast(getFriendlyAuthError(error?.message || 'تعذر تنفيذ حذف الحساب.'), 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const result = await onLogout?.();
      if (!result?.ok) {
        showToast(getFriendlyAuthError(result?.error || result?.message || 'تعذر تسجيل الخروج.'), 'error');
      }
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="الحساب"
        title="إعدادات الحساب"
        subtitle="راجِع بياناتك، عدّل الباسورد، وتابع الدعوات والمزايا من غير شارات أو معلومات شكلية ملهاش فايدة."
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <AppSurface className="rounded-[30px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <SectionHeader title="بيانات الحساب" subtitle="البيانات اللي بتظهر في التطبيق ورسائل الحجز." />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-white">الاسم</span>
                <div className="relative">
                  <User className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-11 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-white">رقم الموبايل</span>
                <div className="relative">
                  <Phone className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-11 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </label>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">الإيميل المسجل: {user?.email || 'غير متوفر'}</p>
              <PrimaryButton onClick={handleSaveProfile} disabled={!isProfileDirty || savingProfile} loading={savingProfile} loadingText="جاري الحفظ…" icon={<Save className="h-4 w-4" />}>
                {savingProfile ? 'جاري الحفظ…' : 'حفظ التعديلات'}
              </PrimaryButton>
            </div>
          </AppSurface>

          <AppSurface className="rounded-[30px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <SectionHeader title="الأمان" subtitle="غيّر الباسورد وقت ما تحتاج، من غير تعقيد." />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-white">باسورد جديد</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-white">تأكيد الباسورد</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">استخدم باسورد قوي وسهل تفتكره.</p>
              <PrimaryButton onClick={changePassword} disabled={!hasPasswordValues || savingPassword} loading={savingPassword} loadingText="جاري التحديث…" icon={<KeyRound className="h-4 w-4" />}>
                {savingPassword ? 'جاري التحديث…' : 'تغيير الباسورد'}
              </PrimaryButton>
            </div>
          </AppSurface>
        </div>

        <div className="space-y-5">
          <AppSurface className="rounded-[30px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <SectionHeader title="التفضيلات" subtitle="حاجات فعلًا تفرق في الاستخدام اليومي." />
            <div className="mt-5 flex items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">الوضع الليلي</p>
                <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">اختار الشكل الأنسب ليك أثناء الاستخدام.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDark((current) => !current)}
                className={`inline-flex h-12 items-center gap-2 rounded-[18px] border px-4 text-sm font-black transition-all ${isDark ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'}`}
              >
                {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {isDark ? 'ليلي' : 'فاتح'}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => openModal('subs')} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-right transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-indigo-800 dark:hover:bg-slate-950">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300"><Crown className="h-5 w-5" /></div>
                <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">الباقات والمزايا</p>
                <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{subscription && subscription !== 'none' ? 'فيه باقة مفعلة حاليًا.' : `معاك ${Number(points || 0)} نقطة.`}</p>
              </button>

              <button type="button" onClick={() => openModal('help')} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-right transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-indigo-800 dark:hover:bg-slate-950">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"><KeyRound className="h-5 w-5" /></div>
                <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">المساعدة والدليل</p>
                <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">شرح الخطوات والإجابات الأساسية في مكان واحد.</p>
              </button>
            </div>
          </AppSurface>

          <ReferralCard
            summary={referralSummary}
            onApplyCode={applyReferralCode}
            onRefresh={refreshReferralSummary}
            showToast={showToast}
            className="rounded-[30px]"
          />

          <AppSurface className="rounded-[30px] border border-rose-200 bg-rose-50/60 p-5 dark:border-rose-900/40 dark:bg-rose-900/10">
            <SectionHeader title="إدارة الحساب" subtitle="إجراءات الخروج أو تعطيل الحساب بشكل واضح." />
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton onClick={handleLogout} disabled={loggingOut} icon={<LogOut className="h-4 w-4" />} className="flex-1 bg-slate-950 hover:bg-slate-800 shadow-slate-950/20 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100">
                {loggingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}
              </PrimaryButton>
              <SecondaryButton onClick={() => setIsDeleteOpen(true)} icon={<Trash2 className="h-4 w-4" />} className="flex-1 border-rose-300 bg-white text-rose-700 hover:border-rose-400 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-950 dark:text-rose-300 dark:hover:bg-rose-950/20">
                حذف الحساب
              </SecondaryButton>
            </div>
          </AppSurface>
        </div>
      </div>

      {isDeleteOpen ? (
        <ModalShell
          onClose={() => {
            if (deletingAccount) return;
            setIsDeleteOpen(false);
            setDeleteConfirmText('');
          }}
          title="تأكيد حذف الحساب"
          subtitle='اكتب كلمة "حذف" للتأكيد.'
          icon={<AlertTriangle className="h-6 w-6" />}
          maxWidth="max-w-lg"
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <SecondaryButton onClick={() => {
                if (deletingAccount) return;
                setIsDeleteOpen(false);
                setDeleteConfirmText('');
              }}>
                رجوع
              </SecondaryButton>
              <PrimaryButton onClick={deleteAccount} disabled={deleteConfirmText.trim() !== 'حذف'} loading={deletingAccount} loadingText="جاري التنفيذ…" className="bg-rose-600 hover:bg-rose-700 shadow-rose-600/25">
                {deletingAccount ? 'جاري التنفيذ…' : 'أكيد، نفّذ حذف الحساب'}
              </PrimaryButton>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 dark:border-rose-900/40 dark:bg-rose-900/10">
              <p className="text-sm font-black text-rose-800 dark:text-rose-200">تنبيه مهم</p>
              <p className="mt-2 text-sm font-bold leading-6 text-rose-700 dark:text-rose-200/85">
                العملية دي هتعطّل الحساب داخل التطبيق وتسجّلك خروج. لو عندك رحلة أو رصيد، راجعهم قبل التنفيذ.
              </p>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-black text-slate-800 dark:text-slate-200">اكتب كلمة "حذف" للتأكيد</span>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder="حذف"
                className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-base font-black text-slate-900 outline-none transition focus:border-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
