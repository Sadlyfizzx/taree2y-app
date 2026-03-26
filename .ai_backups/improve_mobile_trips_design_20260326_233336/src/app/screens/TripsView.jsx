import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ReceiptText,
  Ticket,
} from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import RouteTimeline from '../components/ui/RouteTimeline';
import {
  AppSurface,
  MetaChip,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from '../components/ui/AppPrimitives';
import { EmptyStateCard, InlineNotice } from '../components/ui/StateBlocks';
import { formatCurrency, formatSeatsText } from '../utils/formatting';
import { getCancellationPolicy } from '../utils/travel';
import { withStationNames } from '../utils/stations';

export default function TripsView({
  trips,
  processRefund,
  pendingCancellationBookingIds = [],
  onViewTicket,
  showToast,
}) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancelingTrip, setCancelingTrip] = useState(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);

  const computedTrips = useMemo(
    () => (Array.isArray(trips) ? trips : []).map((trip) => withStationNames(trip)),
    [trips],
  );

  const counts = useMemo(
    () => ({
      upcoming: computedTrips.filter((trip) => ['upcoming', 'refund_pending'].includes(trip.status)).length,
      past: computedTrips.filter((trip) => trip.status === 'past').length,
      cancelled: computedTrips.filter((trip) => trip.status === 'cancelled').length,
    }),
    [computedTrips],
  );

  const filteredTrips = computedTrips.filter((trip) => {
    if (activeTab === 'upcoming') return ['upcoming', 'refund_pending'].includes(trip.status);
    if (activeTab === 'past') return trip.status === 'past';
    return trip.status === 'cancelled';
  });

  useEffect(() => {
    if (!cancelingTrip) setIsCancelSubmitting(false);
  }, [cancelingTrip]);

  const confirmCancel = async () => {
    if (!cancelingTrip || isCancelSubmitting) return;
    setIsCancelSubmitting(true);
    try {
      await processRefund(cancelingTrip);
      setCancelingTrip(null);
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  const cancelPolicy = cancelingTrip ? getCancellationPolicy(cancelingTrip) : null;

  const tabs = [
    { key: 'upcoming', label: 'القادمة', count: counts.upcoming },
    { key: 'past', label: 'السابقة', count: counts.past },
    { key: 'cancelled', label: 'الملغية', count: counts.cancelled },
  ];

  return (
    <div className="app-page-frame min-w-0 overflow-x-clip space-y-6 pb-[calc(env(safe-area-inset-bottom)+118px)] md:pb-0">
      <PageHeading
        eyebrow="رحلاتي"
        title="إدارة الحجوزات"
        subtitle="راجع الحجوزات الحالية والسابقة، وافهم حالة كل رحلة، والإلغاء أو الاسترداد وقت ما يكون متاح."
      />

      {pendingCancellationBookingIds.length > 0 ? (
        <InlineNotice
          tone="warning"
          title="فيه طلب استرداد شغال حالياً"
          text="الرحلة هتفضل ظاهرة بحالة استرداد جاري لحد ما المعالجة تكتمل وينزل المبلغ في المحفظة."
          icon={Clock}
        />
      ) : null}

      <AppSurface className="p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`interactive-press inline-flex items-center gap-2 rounded-[20px] px-4 py-3 text-sm font-black transition-all ${
                activeTab === tab.key
                  ? 'bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white shadow-[0_18px_34px_-20px_rgba(33,86,217,0.45)]'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--surface-soft)]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-[11px] ${activeTab === tab.key ? 'bg-white/15' : 'bg-[var(--surface-soft)]'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </AppSurface>

      {filteredTrips.length === 0 ? (
        <EmptyStateCard
          icon={ReceiptText}
          title={activeTab === 'upcoming' ? 'مفيش حجوزات قادمة' : activeTab === 'past' ? 'مفيش رحلات سابقة' : 'مفيش رحلات ملغية'}
          text={activeTab === 'upcoming' ? 'أول ما تحجز رحلة، هتظهر هنا عشان تراجعها أو تفتح التذكرة.' : activeTab === 'past' ? 'بعد ما الرحلة تنتهي، هتفضل هنا كمرجع سريع.' : 'أي رحلة يتم إلغاؤها هتظهر هنا مع حالة الاسترداد.'}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredTrips.map((trip) => {
            const policy = getCancellationPolicy(trip);
            const bookingId = trip.bookingId || trip.id || null;
            const isPendingCancellation =
              trip.status === 'refund_pending' ||
              (bookingId && pendingCancellationBookingIds.includes(bookingId));
            const primaryActionLabel = trip.status === 'upcoming' ? 'عرض التذكرة' : 'عرض التفاصيل';

            return (
              <AppSurface key={trip.pnr || trip.id} className="flex h-full min-w-0 flex-col overflow-hidden p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black tracking-[0.16em] text-[var(--ink-soft)]">حجز</p>
                    <p className="mt-1 font-mono text-sm font-black text-[var(--ink)]">{trip.pnr || trip.id}</p>
                  </div>
                  {trip.status === 'refund_pending' || isPendingCancellation ? (
                    <StatusBadge label="استرداد جاري" tone="warning" />
                  ) : trip.status === 'cancelled' ? (
                    <StatusBadge label="ملغية" tone="danger" />
                  ) : trip.status === 'past' ? (
                    <StatusBadge label="منتهية" tone="neutral" />
                  ) : (
                    <StatusBadge label="مؤكدة" tone="success" />
                  )}
                </div>

                <div className="mt-4">
                  <RouteTimeline trip={trip} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <MetaChip label={`المقاعد: ${formatSeatsText(trip.selectedSeats)}`} tone="neutral" />
                  <MetaChip label={formatCurrency(trip.finalTotal || trip.price)} tone="brand" />
                  <MetaChip label={trip.class || 'درجة الرحلة'} tone="neutral" />
                </div>

                {trip.status === 'upcoming' ? (
                  <div className="mt-4 rounded-[24px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-4">
                    <p className="text-sm font-black text-[var(--ink)]">قبل التحرك</p>
                    <p className="mt-1 text-sm font-bold leading-6 text-[var(--ink-muted)]">
                      {policy.allowed ? `لو ألغيت دلوقتي المتوقع يرجعلك ${formatCurrency(policy.refundAmount)}.` : policy.message}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <PrimaryButton className="flex-1" onClick={() => onViewTicket(trip)} icon={<Ticket className="h-4 w-4" />}>
                    {primaryActionLabel}
                  </PrimaryButton>
                  {trip.status === 'upcoming' ? (
                    <SecondaryButton
                      className="flex-1"
                      disabled={!policy.allowed || isPendingCancellation}
                      onClick={() => {
                        if (isPendingCancellation) return;
                        if (!policy.allowed) {
                          showToast(policy.message, 'error');
                          return;
                        }
                        setCancelingTrip(trip);
                      }}
                    >
                      {isPendingCancellation ? 'جاري الإلغاء' : 'إلغاء الرحلة'}
                    </SecondaryButton>
                  ) : null}
                </div>
              </AppSurface>
            );
          })}
        </div>
      )}

      {cancelingTrip && cancelPolicy ? (
        <ModalShell
          onClose={() => {
            if (isCancelSubmitting) return;
            setCancelingTrip(null);
          }}
          title="تأكيد إلغاء الرحلة"
          subtitle="راجع الرسوم والمبلغ المتوقع يرجع للمحفظة قبل ما تأكد."
          icon={<AlertTriangle className="h-6 w-6" />}
          maxWidth="max-w-lg"
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <SecondaryButton onClick={() => setCancelingTrip(null)} disabled={isCancelSubmitting}>
                رجوع
              </SecondaryButton>
              <PrimaryButton
                onClick={confirmCancel}
                disabled={!cancelPolicy.allowed || isCancelSubmitting}
                className="bg-rose-600 hover:bg-rose-700 shadow-rose-600/25"
              >
                {isCancelSubmitting ? 'جاري إرسال الطلب…' : 'أكد الإلغاء'}
              </PrimaryButton>
            </div>
          }
        >
          <div className="space-y-4">
            <RouteTimeline trip={cancelingTrip} />
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3 text-sm font-bold">
                  <span className="text-[var(--ink-muted)]">قيمة الحجز الحالية</span>
                  <span className="text-[var(--ink)]">{formatCurrency(cancelingTrip.finalTotal)}</span>
                </div>
                <div className="flex items-start justify-between gap-3 text-sm font-bold text-rose-700 dark:text-rose-300">
                  <span>رسوم الإلغاء ({Math.round(cancelPolicy.feeRatio * 100)}%)</span>
                  <span>- {formatCurrency(Math.round(cancelingTrip.finalTotal * cancelPolicy.feeRatio))}</span>
                </div>
                <div className="app-dashed-divider pt-3">
                  <div className="flex items-start justify-between gap-3 text-base font-black text-emerald-700 dark:text-emerald-300">
                    <span>المبلغ المتوقع يرجع</span>
                    <span>{formatCurrency(cancelPolicy.refundAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
            <InlineNotice
              tone="warning"
              title="بعد التأكيد"
              text="الرحلة هتتحول لحالة استرداد جاري لحد ما المعالجة تكتمل."
              icon={CheckCircle2}
            />
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
