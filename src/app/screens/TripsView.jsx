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
  cx,
} from '../components/ui/AppPrimitives';
import { EmptyStateCard, InlineNotice } from '../components/ui/StateBlocks';
import { formatCurrency, formatInteger, formatPercent, formatSeatsText } from '../utils/formatting';
import { getCancellationPolicy, getTripBookingUiState } from '../utils/travel';
import { withStationNames } from '../utils/stations';

function renderStatusBadge(displayStatus, isPendingCancellation) {
  if (isPendingCancellation) {
    return <StatusBadge label="استرداد جاري" tone="warning" />;
  }

  if (displayStatus === 'cancelled') {
    return <StatusBadge label="ملغية" tone="danger" />;
  }

  if (displayStatus === 'past') {
    return <StatusBadge label="منتهية" tone="neutral" />;
  }

  return <StatusBadge label="نشطة" tone="success" />;
}

export default function TripsView({
  trips,
  processRefund,
  pendingCancellationBookingIds = [],
  onViewTicket,
  showToast,
  isOnline = true,
}) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancelingTrip, setCancelingTrip] = useState(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);

  const computedTrips = useMemo(
    () =>
      (Array.isArray(trips) ? trips : []).map((trip) => {
        const preparedTrip = withStationNames(trip);
        const bookingUi = getTripBookingUiState(preparedTrip);

        return {
          ...preparedTrip,
          bookingUi,
          displayStatus: bookingUi.displayStatus,
        };
      }),
    [trips],
  );

  const counts = useMemo(() => {
    return {
      upcoming: computedTrips.filter((trip) =>
        ['upcoming', 'refund_pending'].includes(trip.displayStatus),
      ).length,
      past: computedTrips.filter((trip) => trip.bookingUi?.isPast).length,
      cancelled: computedTrips.filter((trip) => trip.bookingUi?.isCancelled).length,
    };
  }, [computedTrips]);

  const filteredTrips = useMemo(() => {
    if (activeTab === 'upcoming') {
      return computedTrips.filter((trip) =>
        ['upcoming', 'refund_pending'].includes(trip.displayStatus),
      );
    }

    if (activeTab === 'past') {
      return computedTrips.filter((trip) => trip.bookingUi?.isPast);
    }

    return computedTrips.filter((trip) => trip.bookingUi?.isCancelled);
  }, [activeTab, computedTrips]);

  useEffect(() => {
    if (!cancelingTrip) setIsCancelSubmitting(false);
  }, [cancelingTrip]);

  const cancelPolicy = cancelingTrip
    ? getCancellationPolicy({
        ...cancelingTrip,
        status: getTripBookingUiState(cancelingTrip).displayStatus,
      })
    : null;

  const confirmCancel = async () => {
    if (!cancelingTrip || isCancelSubmitting) return;
    if (!isOnline) {
      showToast('أنت حالياً أوفلاين. اتأكد من الإنترنت قبل طلب الإلغاء.', 'warning');
      return;
    }

    setIsCancelSubmitting(true);
    try {
      await processRefund(cancelingTrip);
      setCancelingTrip(null);
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  return (
    <div className="app-page-frame min-w-0 overflow-x-clip space-y-5">
      <PageHeading
        eyebrow="الحجوزات والتذاكر"
        title="رحلاتي"
        subtitle="راجع الرحلات الحالية، افتح التذكرة بسرعة، وتابع أي حالة استرداد أو رحلة منتهية من نفس المكان."
      />

      {!isOnline ? (
        <InlineNotice
          tone="warning"
          title="أنت أوفلاين حالياً"
          text="تقدر تراجع الرحلات والتذاكر المحفوظة، لكن الإلغاء أو تحديث الحالة يحتاج إنترنت ثابت."
          icon={Clock}
        />
      ) : null}

      <AppSurface className="p-1.5 sm:p-2">
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
          {[
            { key: 'upcoming', label: 'القادمة', count: counts.upcoming },
            { key: 'past', label: 'السابقة', count: counts.past },
            { key: 'cancelled', label: 'الملغية', count: counts.cancelled },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`interactive-press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition-all ${
                activeTab === item.key
                  ? 'border-transparent bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]'
                  : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink-muted)]'
              }`}
            >
              <span>{item.label}</span>
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] dark:bg-white/10">
                {formatInteger(item.count)}
              </span>
            </button>
          ))}
        </div>
      </AppSurface>

      {filteredTrips.length === 0 ? (
        <EmptyStateCard
          icon={ReceiptText}
          title={
            activeTab === 'upcoming'
              ? 'مفيش رحلات قادمة'
              : activeTab === 'past'
              ? 'مفيش رحلات سابقة'
              : 'مفيش رحلات ملغية'
          }
          text={
            activeTab === 'upcoming'
              ? 'أول ما تحجز رحلة، هتظهر هنا عشان تراجعها أو تفتح التذكرة. ولو فيه استرداد جاري هيفضل ظاهر هنا لحد ما يكتمل.'
              : activeTab === 'past'
              ? 'بعد ما الرحلة تنتهي، هتفضل هنا كمرجع سريع.'
              : 'أي رحلة يتم إلغاؤها هتظهر هنا مع حالة الاسترداد.'
          }
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredTrips.map((trip) => {
            const tripUi = trip.bookingUi || getTripBookingUiState(trip);
            const displayStatus = tripUi.displayStatus;
            const policy = getCancellationPolicy({ ...trip, status: displayStatus });
            const bookingId = trip.bookingId || trip.id || null;
            const isPendingCancellation =
              tripUi.isRefundPending ||
              (bookingId && pendingCancellationBookingIds.includes(bookingId));
            const primaryActionLabel = 'عرض التذكرة';

            return (
              <AppSurface
                key={trip.pnr || trip.id}
                className={cx(
                  'flex h-full min-w-0 flex-col overflow-hidden rounded-[28px] p-3 sm:rounded-[30px] sm:p-4 md:p-5',
                  tripUi.isPast &&
                    'border-[var(--line)]/90 bg-[var(--surface-soft)]/70 opacity-[0.86] saturate-[0.94]',
                )}
              >
                <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black tracking-[0.14em] text-[var(--ink-soft)] sm:text-xs">
                      حجز
                    </p>
                    <p className="mt-1 truncate font-mono text-[15px] font-black tracking-[0.03em] text-[var(--ink)] sm:text-sm">
                      {trip.pnr || trip.id}
                    </p>
                  </div>
                  {renderStatusBadge(displayStatus, isPendingCancellation)}
                </div>

                <div className="mt-3.5 sm:mt-4">
                  <RouteTimeline trip={trip} className="sm:rounded-[24px]" />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:flex sm:flex-wrap">
                  <MetaChip
                    className="min-h-10 justify-center rounded-[18px] px-3 py-2 text-[11px] sm:justify-start sm:text-xs"
                    label={formatCurrency(trip.finalTotal || trip.price)}
                    tone="brand"
                  />
                  {!tripUi.isPast ? (
                    <MetaChip
                      className="min-h-10 justify-center rounded-[18px] px-3 py-2 text-[11px] sm:justify-start sm:text-xs"
                      label={`المقاعد: ${formatSeatsText(trip.selectedSeats)}`}
                      tone="neutral"
                    />
                  ) : null}
                </div>

                {tripUi.isPast ? (
                  <div className="mt-3 rounded-[20px] border border-[var(--line)]/90 bg-[var(--surface-soft)] px-3 py-3 sm:mt-4 sm:rounded-[22px] sm:px-4 sm:py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[12px] font-black text-[var(--ink)] sm:text-sm">
                          حالة الرحلة
                        </p>
                        <p className="mt-1 text-[12px] font-bold leading-5 text-[var(--ink-muted)] sm:text-sm sm:leading-6">
                          {tripUi.bookability?.reason || 'الرحلة دي خلصت بالفعل'}
                        </p>
                      </div>
                      <Clock className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[var(--ink-soft)]" />
                    </div>
                  </div>
                ) : null}

                {displayStatus === 'upcoming' ? (
                  <div className="mt-3 rounded-[20px] border border-[var(--line)]/90 bg-[var(--surface-soft)] px-3 py-3 sm:mt-4 sm:rounded-[22px] sm:px-4 sm:py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[12px] font-black text-[var(--ink)] sm:text-sm">
                          قبل التحرك
                        </p>
                        <p className="mt-1 text-[12px] font-bold leading-5 text-[var(--ink-muted)] sm:text-sm sm:leading-6">
                          {policy.allowed
                            ? `لو ألغيت دلوقتي المتوقع يرجعلك ${formatCurrency(policy.refundAmount)}.`
                            : policy.message}
                        </p>
                      </div>
                      {policy.allowed ? (
                        <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row">
                  <PrimaryButton
                    className="w-full sm:flex-1"
                    onClick={() => onViewTicket({ ...trip, status: displayStatus })}
                    icon={<Ticket className="h-4 w-4" />}
                  >
                    {primaryActionLabel}
                  </PrimaryButton>

                  {displayStatus === 'upcoming' ? (
                    <SecondaryButton
                      className="w-full sm:flex-1"
                      disabled={!isOnline || !policy.allowed || isPendingCancellation}
                      onClick={() => {
                        if (!isOnline) {
                          showToast('أنت حالياً أوفلاين. اتأكد من الإنترنت قبل طلب الإلغاء.', 'warning');
                          return;
                        }
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
              <SecondaryButton
                onClick={() => setCancelingTrip(null)}
                disabled={isCancelSubmitting}
              >
                رجوع
              </SecondaryButton>
              <PrimaryButton
                onClick={confirmCancel}
                disabled={!isOnline || !cancelPolicy.allowed || isCancelSubmitting}
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
                  <span className="text-[var(--ink)]">
                    {formatCurrency(cancelingTrip.finalTotal)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3 text-sm font-bold text-rose-700 dark:text-rose-300">
                  <span>رسوم الإلغاء ({formatPercent(cancelPolicy.feeRatio, { scale: 100 })})</span>
                  <span>
                    - {formatCurrency(Math.round(cancelingTrip.finalTotal * cancelPolicy.feeRatio))}
                  </span>
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
