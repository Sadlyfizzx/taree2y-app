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
import { getCancellationPolicy, getTripLifecycleStatus } from '../utils/travel';
import { withStationNames } from '../utils/stations';

const resolveDisplayStatus = (trip) => {
  const rawStatus = String(trip?.status || '').trim();

  if (['cancelled', 'refund_pending', 'past'].includes(rawStatus)) {
    return rawStatus;
  }

  if (!trip?.date || !trip?.departureTime || !trip?.arrivalTime) {
    return rawStatus || 'upcoming';
  }

  const lifecycle = getTripLifecycleStatus(trip);

  if (lifecycle?.code === 'finished' || lifecycle?.code === 'departed') {
    return 'past';
  }

  return rawStatus || 'upcoming';
};

function renderStatusBadge(displayStatus, isPendingCancellation) {
  if (displayStatus === 'refund_pending' || isPendingCancellation) {
    return <StatusBadge label="استرداد جاري" tone="warning" />;
  }
  if (displayStatus === 'cancelled') {
    return <StatusBadge label="ملغية" tone="danger" />;
  }
  if (displayStatus === 'past') {
    return <StatusBadge label="منتهية" tone="neutral" />;
  }
  return <StatusBadge label="مؤكدة" tone="success" />;
}

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
    () =>
      (Array.isArray(trips) ? trips : []).map((trip) => {
        const preparedTrip = withStationNames(trip);
        return {
          ...preparedTrip,
          displayStatus: resolveDisplayStatus(preparedTrip),
        };
      }),
    [trips],
  );

  const counts = useMemo(
    () => ({
      upcoming: computedTrips.filter((trip) => ['upcoming', 'refund_pending'].includes(trip.displayStatus)).length,
      past: computedTrips.filter((trip) => trip.displayStatus === 'past').length,
      cancelled: computedTrips.filter((trip) => trip.displayStatus === 'cancelled').length,
    }),
    [computedTrips],
  );

  const filteredTrips = computedTrips.filter((trip) => {
    if (activeTab === 'upcoming') return ['upcoming', 'refund_pending'].includes(trip.displayStatus);
    if (activeTab === 'past') return trip.displayStatus === 'past';
    return trip.displayStatus === 'cancelled';
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

  const cancelPolicy = cancelingTrip
    ? getCancellationPolicy({ ...cancelingTrip, status: resolveDisplayStatus(cancelingTrip) })
    : null;

  const tabs = [
    { key: 'upcoming', label: 'القادمة', count: counts.upcoming },
    { key: 'past', label: 'السابقة', count: counts.past },
    { key: 'cancelled', label: 'الملغية', count: counts.cancelled },
  ];

  return (
    <div className="app-page-frame min-w-0 overflow-x-clip space-y-5 pb-[calc(env(safe-area-inset-bottom)+132px)] md:space-y-6 md:pb-0">
      <PageHeading
        eyebrow="رحلاتي"
        title="إدارة الحجوزات"
        subtitle="راجع الحجوزات الحالية والسابقة، وافهم حالة كل رحلة، والإلغاء أو الاسترداد وقت ما يكون متاح."
        className="gap-2.5 [&_h1]:text-[1.9rem] [&_h1]:leading-[1.05] [&_p]:mt-1.5 [&_p]:max-w-none [&_p]:text-[13px] [&_p]:leading-6 sm:[&_h1]:text-2xl sm:[&_p]:text-sm sm:[&_p]:leading-7 md:[&_h1]:text-[2rem]"
      />

      {pendingCancellationBookingIds.length > 0 ? (
        <InlineNotice
          tone="warning"
          title="فيه طلب استرداد شغال حالياً"
          text="الرحلة هتفضل ظاهرة بحالة استرداد جاري لحد ما المعالجة تكتمل وينزل المبلغ في المحفظة."
          icon={Clock}
        />
      ) : null}

      <AppSurface className="p-1.5 sm:p-2">
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`interactive-press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[18px] px-3.5 py-2.5 text-[13px] font-black transition-all sm:px-4 sm:py-3 sm:text-sm ${
                activeTab === tab.key
                  ? 'bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white shadow-[0_18px_34px_-20px_rgba(33,86,217,0.45)]'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--surface-soft)]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-[10px] sm:text-[11px] ${activeTab === tab.key ? 'bg-white/15' : 'bg-[var(--surface-soft)]'}`}>
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
        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredTrips.map((trip) => {
            const displayStatus = trip.displayStatus || resolveDisplayStatus(trip);
            const policy = getCancellationPolicy({ ...trip, status: displayStatus });
            const bookingId = trip.bookingId || trip.id || null;
            const isPendingCancellation =
              displayStatus === 'refund_pending' ||
              (bookingId && pendingCancellationBookingIds.includes(bookingId));
            const primaryActionLabel = displayStatus === 'upcoming' ? 'عرض التذكرة' : 'عرض التفاصيل';
            const operatorLabel = trip.company || 'شركة الرحلة';
            const classLabel = trip.class || 'درجة الرحلة';

            return (
              <AppSurface
                key={trip.pnr || trip.id}
                className="flex h-full min-w-0 flex-col overflow-hidden rounded-[28px] p-3 sm:rounded-[30px] sm:p-4 md:p-5"
              >
                <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black tracking-[0.14em] text-[var(--ink-soft)] sm:text-xs">حجز</p>
                    <p className="mt-1 truncate font-mono text-[15px] font-black tracking-[0.03em] text-[var(--ink)] sm:text-sm">{trip.pnr || trip.id}</p>
                  </div>
                  {renderStatusBadge(displayStatus, isPendingCancellation)}
                </div>

                <div className="mt-3.5 sm:mt-4">
                  <RouteTimeline trip={trip} className="sm:rounded-[24px]" />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:flex sm:flex-wrap">
                  <MetaChip className="min-h-10 justify-center rounded-[18px] px-3 py-2 text-[11px] sm:justify-start sm:text-xs" label={formatCurrency(trip.finalTotal || trip.price)} tone="brand" />
                  <MetaChip className="min-h-10 justify-center rounded-[18px] px-3 py-2 text-[11px] sm:justify-start sm:text-xs" label={`المقاعد: ${formatSeatsText(trip.selectedSeats)}`} tone="neutral" />
                  <MetaChip className="hidden sm:inline-flex sm:justify-start" label={classLabel} tone="neutral" />
                </div>

                {displayStatus === 'upcoming' ? (
                  <div className="mt-3 rounded-[20px] border border-[var(--line)]/90 bg-[var(--surface-soft)] px-3 py-3 sm:mt-4 sm:rounded-[22px] sm:px-4 sm:py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[12px] font-black text-[var(--ink)] sm:text-sm">قبل التحرك</p>
                        <p className="mt-1 text-[12px] font-bold leading-5 text-[var(--ink-muted)] sm:text-sm sm:leading-6">
                          {policy.allowed ? `لو ألغيت دلوقتي المتوقع يرجعلك ${formatCurrency(policy.refundAmount)}.` : policy.message}
                        </p>
                      </div>
                      {policy.allowed ? <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600 dark:text-emerald-300" /> : null}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row">
                  <PrimaryButton className="w-full sm:flex-1" onClick={() => onViewTicket(trip)} icon={<Ticket className="h-4 w-4" />}>
                    {primaryActionLabel}
                  </PrimaryButton>
                  {displayStatus === 'upcoming' ? (
                    <SecondaryButton
                      className="w-full sm:flex-1"
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
                    <span>المبلغ المتوقع يرجع للمحفظة</span>
                    <span>{formatCurrency(cancelPolicy.refundAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
