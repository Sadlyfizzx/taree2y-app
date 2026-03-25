import React, { useMemo, useState } from 'react';
import {
  Bug,
  Copy,
  ExternalLink,
  RefreshCcw,
  Route,
  Ticket,
  WalletCards,
} from 'lucide-react';
import ModalShell from '../ui/ModalShell';
import {
  MetaChip,
  PrimaryButton,
  SecondaryButton,
} from '../ui/AppPrimitives';
import { InlineNotice } from '../ui/StateBlocks';
import { formatCurrency } from '../../utils/formatting';
import {
  buildWalletTopupUrl,
  copyTextWithFallback,
  createPublicTripShare,
  createWalletRequestId,
} from '../../public/publicPortal';

function safeAmount(value) {
  return Math.max(1, Math.round(Number(value) || 0));
}

export default function InternalOpsPanel({
  closeModal,
  userId,
  user,
  wallet,
  points,
  subscription,
  latestTrip,
  onRefresh,
  onOpenLatestTicket,
  onOpenLatestTracking,
  showToast,
}) {
  const [topupAmount, setTopupAmount] = useState('100');
  const [busyAction, setBusyAction] = useState('');

  const hasLatestTrip = Boolean(latestTrip?.bookingId || latestTrip?.id);
  const parsedTopupAmount = safeAmount(topupAmount);

  const latestTripLabel = useMemo(
    () => latestTrip?.pnr || latestTrip?.bookingId || latestTrip?.id || '—',
    [latestTrip],
  );

  const latestWalletTopupUrl = useMemo(
    () =>
      buildWalletTopupUrl({
        userId,
        amount: parsedTopupAmount,
        requestId: createWalletRequestId(),
      }),
    [parsedTopupAmount, userId],
  );

  const handleCopy = async (value, label, successMessage) => {
    const copied = await copyTextWithFallback(value, label);
    showToast(
      copied ? successMessage : `تعذر نسخ ${label} حالياً.`,
      copied ? 'success' : 'error',
    );
  };

  const handleRefresh = async () => {
    if (busyAction) return;

    setBusyAction('refresh');
    try {
      await onRefresh?.({ silent: false, force: true });
      showToast('تم تحديث الحالة من السيرفر.', 'success');
    } catch {
      showToast('تعذر تحديث الحالة من السيرفر.', 'error');
    } finally {
      setBusyAction('');
    }
  };

  const handleCreateLatestShare = async () => {
    if (!hasLatestTrip || busyAction) return;

    setBusyAction('share');
    try {
      const share = await createPublicTripShare({
        bookingId: latestTrip?.bookingId || latestTrip?.id || null,
        pnr: latestTrip?.pnr || null,
        publicTripCode:
          latestTrip?.publicTripCode ||
          latestTrip?.pnr ||
          latestTrip?.bookingId ||
          latestTrip?.id ||
          null,
        from: latestTrip?.from || '',
        to: latestTrip?.to || '',
        date: latestTrip?.date || '',
        departureTime: latestTrip?.departureTime || '',
        arrivalTime: latestTrip?.arrivalTime || '',
        durationHour: latestTrip?.durationHour || 0,
        company: latestTrip?.company || '',
        class: latestTrip?.class || '',
        selectedSeats: Array.isArray(latestTrip?.selectedSeats)
          ? latestTrip.selectedSeats
          : [],
      });

      const copied = await copyTextWithFallback(share?.url || '', 'رابط المتابعة');
      showToast(
        copied
          ? 'تم إنشاء ونسخ رابط المتابعة العام.'
          : 'تم إنشاء الرابط لكن تعذر نسخه تلقائياً.',
        copied ? 'success' : 'warning',
      );
    } catch {
      showToast('تعذر إنشاء رابط متابعة عام الآن.', 'error');
    } finally {
      setBusyAction('');
    }
  };

  const handleOpenWalletLink = () => {
    if (!latestWalletTopupUrl) return;
    window.open(latestWalletTopupUrl, '_blank', 'noopener,noreferrer');
    showToast('تم فتح صفحة الشحن العامة في نافذة جديدة.', 'success');
  };

  return (
    <ModalShell
      onClose={closeModal}
      title="طبقة التشغيل الداخلية"
      subtitle="لوحة تشغيل صغيرة قبل بناء لوحة إدارة كاملة. الأدوات هنا تشخيصية وآمنة على مستوى الواجهة."
      icon={<Bug className="h-6 w-6" />}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={closeModal}>إغلاق</SecondaryButton>
          <PrimaryButton
            onClick={handleRefresh}
            loading={busyAction === 'refresh'}
            loadingText="جاري التحديث…"
          >
            تحديث الحالة الآن
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-5">
        <InlineNotice
          tone="warning"
          title="تشغيل داخلي فقط"
          text="فعّل اللوحة فقط للمتابعة والدعم والـ QA. هي لا تستبدل لوحة إدارة حقيقية أو صلاحيات سيرفر."
        />

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-sm font-black text-slate-900 dark:text-white">ملخص سريع</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <MetaChip label={`المستخدم ${user?.name || '—'}`} tone="neutral" />
            <MetaChip label={`الرصيد ${formatCurrency(wallet)}`} tone="brand" />
            <MetaChip label={`النقاط ${points}`} tone="success" />
            <MetaChip label={`الباقة ${subscription || 'none'}`} tone="warning" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <SecondaryButton
              icon={<Copy className="h-4 w-4" />}
              onClick={() =>
                handleCopy(
                  userId,
                  'معرّف المستخدم',
                  'تم نسخ معرّف المستخدم.',
                )
              }
            >
              نسخ user id
            </SecondaryButton>
            <SecondaryButton
              icon={<Copy className="h-4 w-4" />}
              onClick={() =>
                handleCopy(
                  user?.email || '',
                  'الإيميل',
                  'تم نسخ إيميل الحساب.',
                )
              }
            >
              نسخ الإيميل
            </SecondaryButton>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">آخر تذكرة معروفة</p>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                {hasLatestTrip ? latestTripLabel : 'لا توجد تذكرة حالياً'}
              </p>
            </div>
            <Ticket className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <SecondaryButton
              onClick={onOpenLatestTicket}
              disabled={!hasLatestTrip}
            >
              افتح التذكرة
            </SecondaryButton>
            <SecondaryButton
              onClick={onOpenLatestTracking}
              disabled={!hasLatestTrip}
            >
              افتح التتبع
            </SecondaryButton>
            <SecondaryButton
              icon={<Route className="h-4 w-4" />}
              onClick={handleCreateLatestShare}
              disabled={!hasLatestTrip || busyAction === 'share'}
            >
              {busyAction === 'share' ? 'جاري الإنشاء…' : 'أنشئ رابط تتبع عام'}
            </SecondaryButton>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">رابط الشحن العام</p>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                أداة دعم سريعة لفتح أو نسخ صفحة الشحن العامة لنفس الحساب.
              </p>
            </div>
            <WalletCards className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="number"
              min="1"
              value={topupAmount}
              onChange={(event) => setTopupAmount(event.target.value)}
              className="h-12 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="المبلغ"
            />
            <div className="flex flex-wrap gap-2">
              <SecondaryButton
                icon={<Copy className="h-4 w-4" />}
                onClick={() =>
                  handleCopy(
                    latestWalletTopupUrl,
                    'رابط الشحن',
                    'تم نسخ رابط الشحن العام.',
                  )
                }
              >
                انسخ الرابط
              </SecondaryButton>
              <SecondaryButton
                icon={<ExternalLink className="h-4 w-4" />}
                onClick={handleOpenWalletLink}
              >
                افتح الرابط
              </SecondaryButton>
            </div>
          </div>
        </div>

        <InlineNotice
          tone="info"
          title="أفضل استخدام الآن"
          text="استخدم الطبقة دي لتحديث الحالة، نسخ المعرفات، توليد روابط المشاركة، وفتح صفحة شحن عامة لنفس المستخدم من غير ما تبني Dashboard كامل من البداية."
        />
      </div>
    </ModalShell>
  );
}
