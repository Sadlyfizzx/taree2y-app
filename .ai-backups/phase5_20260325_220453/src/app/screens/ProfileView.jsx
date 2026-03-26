import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
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
  isDark,
  setIsDark,
  refreshProfile,
  onLogout,
  showToast,
  openModal,
  openGuide,
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

  const hasProfileChanges =
    displayName.trim() !== initial.displayName.trim() ||
    phone.trim() !== initial.phone.trim();

  const saveProfile = async () => {
    if (savingProfile) return;

    if (!displayName.trim()) {
      showToast('اكتب الاسم الأول.', 'error');
      return;
    }

    setSavingProfile(true);

    try {
      await updateCurrentUserProfile({
        displayName,
        phone,
      });

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

      if (result?.ok === false) {
        throw result.error || new Error('logout_failed');
      }
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
      showToast('تم تنفيذ طلب حذف الحساب.', 'success');
    } catch (error) {
      log.error('account_delete_failed', { error });
      showToast(getFriendlyAuthError(error, 'delete_account'), 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="الحساب"
        title="الحساب والإعدادات"
        subtitle="عدّل بياناتك الأساسية، راجع المساعدة، وتحكم في شكل التطبيق من هنا."
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <AppSurface className="p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-20 w-20 place-items-center rounded-[28px] bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-3xl font-black text-white shadow-lg shadow-indigo-600/25">
              {(displayName || profile?.display_name || user?.name || 'م').charAt(0)}
            </span>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {displayName || profile?.display_name || user?.name || 'مستخدم'}
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400" dir="ltr">
                {phone || 'مفيش رقم موبايل مسجل'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <MetaChip label="العربية المصرية" tone="brand" />
                <MetaChip label={isDark ? 'الوضع الليلي مفعل' : 'الوضع النهاري'} tone="neutral" />
              </div>
            </div>
          </div>
        </AppSurface>

        <AppSurface className="p-6">
          <SectionHeader title="روابط سريعة" subtitle="للمساعدة أو مراجعة الخطوات في أي وقت." />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <SecondaryButton onClick={() => openModal('help')} icon={<BookOpen className="h-4 w-4" />} className="justify-start">
              مركز المساعدة
            </SecondaryButton>
            <SecondaryButton onClick={openGuide} icon={<BookOpen className="h-4 w-4" />} className="justify-start">
              الدليل السريع
            </SecondaryButton>
          </div>
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

            <PrimaryButton onClick={saveProfile} disabled={!hasProfileChanges} loading={savingProfile} loadingText="جاري الحفظ…" icon={<Save className="h-5 w-5" />}>
              {savingProfile ? 'جاري الحفظ…' : 'حفظ البيانات'}
            </PrimaryButton>
          </div>
        </AppSurface>

        <AppSurface className="p-6">
          <SectionHeader title="تغيير الباسورد" subtitle="لو حابب تغيّر كلمة المرور، اعملها من هنا." />
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

            <PrimaryButton onClick={changePassword} loading={savingPassword} loadingText="جاري التحديث…" icon={<KeyRound className="h-5 w-5" />}>
              {savingPassword ? 'جاري التحديث…' : 'تغيير الباسورد'}
            </PrimaryButton>
          </div>
        </AppSurface>
      </div>

      <AppSurface className="p-5">
        <SectionHeader title="إعدادات العرض" subtitle="اختار الشكل الأنسب ليك أثناء الاستخدام." />
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">الوضع الليلي</p>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">للاستخدام الليلي أو لو بتحب واجهة أهدى.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsDark((currentValue) => !currentValue)}
            className={`flex min-h-12 min-w-[160px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-all ${
              isDark
                ? 'border-indigo-700 bg-indigo-900/30 text-indigo-200'
                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {isDark ? 'إيقاف الوضع الليلي' : 'تفعيل الوضع الليلي'}
          </button>
        </div>
      </AppSurface>

      <AppSurface className="border-rose-200 bg-rose-50/60 p-5 dark:border-rose-900/40 dark:bg-rose-900/10">
        <SectionHeader title="حذف الحساب" subtitle="لو قررت توقف استخدام الحساب، أكّد الطلب من هنا." />
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-rose-800 dark:text-rose-200">سيتم تعطيل حسابك وتسجيل خروجك من التطبيق بعد تأكيد الطلب.</p>
          </div>
          <SecondaryButton
            onClick={() => setIsDeleteOpen(true)}
            icon={<Trash2 className="h-4 w-4" />}
            className="border-rose-300 bg-white text-rose-700 hover:border-rose-400 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-950 dark:text-rose-300 dark:hover:bg-rose-950/20"
          >
            حذف الحساب
          </SecondaryButton>
        </div>
      </AppSurface>

      <PrimaryButton onClick={handleLogout} disabled={loggingOut} icon={<LogOut className="h-5 w-5" />} className="w-full bg-rose-600 hover:bg-rose-700 shadow-rose-600/25 md:max-w-sm">
        {loggingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}
      </PrimaryButton>

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
              <SecondaryButton
                onClick={() => {
                  if (deletingAccount) return;
                  setIsDeleteOpen(false);
                  setDeleteConfirmText('');
                }}
              >
                رجوع
              </SecondaryButton>
              <PrimaryButton
                onClick={deleteAccount}
                disabled={deletingAccount || deleteConfirmText.trim() !== 'حذف'}
                className="bg-rose-600 hover:bg-rose-700 shadow-rose-600/25"
              >
                {deletingAccount ? 'جاري التنفيذ…' : 'أكد الحذف'}
              </PrimaryButton>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
              بعد التأكيد، لن تتمكن من الدخول بهذا الحساب حتى تتم مراجعته حسب إعدادات الخدمة.
            </p>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-black text-slate-800 dark:text-slate-200">اكتب كلمة حذف</span>
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

export default ProfileView;
