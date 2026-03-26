import React, { useMemo, useState } from 'react';
import {
  Copy,
  Gift,
  Link2,
  RefreshCcw,
  Send,
  TicketPercent,
  UserPlus,
} from 'lucide-react';
import {
  AppSurface,
  MetaChip,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
} from './AppPrimitives';
import { InlineNotice } from './StateBlocks';
import { copyTextWithFallback } from '../../public/publicPortal';
import { buildReferralShareUrl } from '../../../lib/engagement';

function safeNumber(value) {
  return Math.max(0, Number(value) || 0);
}

export default function ReferralCard({
  summary,
  onApplyCode,
  onRefresh,
  showToast,
  className = '',
}) {
  const [inputCode, setInputCode] = useState('');
  const [busyAction, setBusyAction] = useState('');

  const referralCode = String(summary?.code || '').trim().toUpperCase();
  const appliedCode = String(summary?.appliedCode || '').trim().toUpperCase();
  const shareUrl = useMemo(() => buildReferralShareUrl(referralCode), [referralCode]);
  const canApplyCode = Boolean(summary?.canApplyCode ?? !appliedCode);

  const copyValue = async (value, label, successMessage) => {
    const copied = await copyTextWithFallback(value, label);
    showToast(
      copied ? successMessage : `تعذر نسخ ${label} حالياً.`,
      copied ? 'success' : 'error',
    );
  };

  const handleApply = async () => {
    if (!canApplyCode || !onApplyCode || busyAction) return;

    setBusyAction('apply');
    try {
      await onApplyCode(inputCode);
      setInputCode('');
    } finally {
      setBusyAction('')
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh || busyAction) return;

    setBusyAction('refresh');
    try {
      await onRefresh();
      showToast('تم تحديث حالة الدعوات.', 'success');
    } catch {
      showToast('تعذر تحديث الحالة حالياً.', 'error');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <AppSurface className={`p-6 ${className}`.trim()}>
      <SectionHeader
        title="الدعوات والإحالة"
        subtitle="شارك الكود الخاص بيك أو اربط حسابك بكود دعوة قبل أول حجز فعلي."
      />

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">كود الدعوة</p>
              <p className="mt-2 text-3xl font-black tracking-[0.18em] text-indigo-700 dark:text-indigo-300">
                {referralCode || '— — — —'}
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                شاركه مع أصحابك. لما أول رحلة لهم تكتمل، الحالة هتتحدث تلقائيًا.
              </p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-[22px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
              <Gift className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <MetaChip label={`${safeNumber(summary?.totalInvites)} دعوة`} tone="brand" />
            <MetaChip label={`${safeNumber(summary?.pendingInvites)} قيد الاكتمال`} tone="warning" />
            <MetaChip label={`${safeNumber(summary?.qualifiedInvites)} مكتملة`} tone="success" />
            <MetaChip label={`${safeNumber(summary?.rewardedInvites)} تم احتسابها`} tone="neutral" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <SecondaryButton
              icon={<Copy className="h-4 w-4" />}
              onClick={() => copyValue(referralCode, 'كود الدعوة', 'تم نسخ كود الدعوة.')}
              disabled={!referralCode}
            >
              انسخ الكود
            </SecondaryButton>
            <SecondaryButton
              icon={<Link2 className="h-4 w-4" />}
              onClick={() => copyValue(shareUrl, 'رابط الدعوة', 'تم نسخ رابط الدعوة.')}
              disabled={!shareUrl}
            >
              انسخ الرابط
            </SecondaryButton>
            <SecondaryButton
              icon={<RefreshCcw className="h-4 w-4" />}
              onClick={handleRefresh}
              disabled={busyAction === 'refresh'}
            >
              {busyAction === 'refresh' ? 'جاري التحديث…' : 'تحديث الحالة'}
            </SecondaryButton>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">استخدم كود دعوة</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                لو وصلك كود من صديق، استخدمه مرة واحدة قبل أول حجز.
              </p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-[22px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <UserPlus className="h-5 w-5" />
            </span>
          </div>

          {appliedCode ? (
            <InlineNotice
              tone="success"
              title="تم ربط الحساب بالفعل"
              text={`الكود المرتبط حاليًا: ${appliedCode}`}
            />
          ) : null}

          <label className="mt-4 flex flex-col gap-2">
            <span className="text-sm font-black text-slate-800 dark:text-slate-200">كود الدعوة</span>
            <input
              type="text"
              value={inputCode}
              onChange={(event) => setInputCode(event.target.value.toUpperCase())}
              placeholder="مثال: FRIEND7"
              dir="ltr"
              disabled={!canApplyCode || busyAction === 'apply'}
              className="h-14 w-full rounded-[22px] border border-slate-200 bg-white px-4 text-base font-black tracking-[0.12em] text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <PrimaryButton
              onClick={handleApply}
              disabled={!canApplyCode || !String(inputCode || '').trim() || busyAction === 'apply'}
              icon={<TicketPercent className="h-4 w-4" />}
            >
              {busyAction === 'apply' ? 'جاري الربط…' : 'استخدم الكود'}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => setInputCode('')}
              disabled={!inputCode || busyAction === 'apply'}
              icon={<Send className="h-4 w-4" />}
            >
              مسح الإدخال
            </SecondaryButton>
          </div>

          {summary?.message ? (
            <p className="mt-4 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
              {summary.message}
            </p>
          ) : null}
        </div>
      </div>
    </AppSurface>
  );
}
