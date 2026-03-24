import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
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

function TripsView({
  trips,
  _setMyTrips,
  processRefund,
  pendingCancellationBookingIds = [],
  onViewTicket,
  showToast,
}) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancelingTrip, setCancelingTrip] = useState(null);

  const computedTrips = useMemo(
    () =>
      trips.map((trip) => {
        if (trip.status !== 'upcoming') return withStationNames(trip);
        const lifecycle = getTripLifecycleStatus(trip);
        if (lifecycle.key === 'arrived') return withStationNames({ ...trip, status: 'past' });
        return withStationNames(trip);
      }),
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

  const confirmCancel = () => {
    if (!cancelingTrip) return;
    processRefund(cancelingTrip);
    setCancelingTrip(null);
  };

  const cancelPolicy = cancelingTrip ? getCancellationPolicy(cancelingTrip) : null;

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="رحلاتي"
        title="كل حجوزاتك في مكان واحد"
        subtitle="هتلاقي الرحلات الجاية، اللي خلصت، والملغية مع حالة كل واحدة بشكل واضح."
      />

      {pendingCancellationBookingIds.length > 0 ? (
        <InlineNotice
          tone="warning"
          title="فيه طلب استرداد شغال حالياً"
          text='هتلاقي الرحلة بحالة "استرداد جاري" لحد ما العملية تكتمل وينزل المبلغ في المحفظة.'
          icon={Clock}
        />
      ) : null}

      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'upcoming', label: `الجاية (${counts.upcoming})` },
          { key: 'past', label: `السابقة (${counts.past})` },
          { key: 'cancelled', label: `الملغية (${counts.cancelled})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full border px-4 py-2 text-sm font-black transition-all ${
              activeTab === tab.key
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredTrips.length === 0 ? (
        <EmptyStateCard
          icon={Ticket}
          title={
            activeTab === 'upcoming'
              ? 'مفيش رحلات جاية حالياً'
              : activeTab === 'past'
              ? 'مفيش رحلات سابقة محفوظة'
              : 'مفيش رحلات ملغية'
          }
          text={
            activeTab === 'upcoming'
              ? 'أول ما تحجز رحلة جديدة هتظهر هنا بكل تفاصيلها.'
              : activeTab === 'past'
              ? 'بعد ما أي رحلة تنتهي، هتتنقل تلقائيًا للقائمة دي.'
              : 'أي رحلة يتم إلغاؤها هتظهر هنا مع حالة الاسترداد.'
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredTrips.map((trip) => {
            const policy = getCancellationPolicy(trip);
            const bookingId = trip.bookingId || trip.id || null;
            const isPendingCancellation =
              trip.status === 'refund_pending' ||
              (bookingId && pendingCancellationBookingIds.includes(bookingId));

            return (
              <AppSurface key={trip.pnr || trip.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">PNR</p>
                    <p className="mt-1 font-mono text-sm font-black text-slate-900 dark:text-white">
                      {trip.pnr || trip.id}
                    </p>
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
                  <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="text-sm font-black text-slate-900 dark:text-white">الإلغاء قبل التحرك</p>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                      {policy.allowed
                        ? `لو ألغيت دلوقتي المتوقع يرجعلك ${formatCurrency(policy.refundAmount)}.`
                        : policy.message}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <PrimaryButton className="flex-1" onClick={() => onViewTicket(trip)}>
                    افتح التذكرة
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
          onClose={() => setCancelingTrip(null)}
          title="تأكيد إلغاء الرحلة"
          subtitle="راجع الرسوم والمبلغ المتوقع يرجع للمحفظة."
          icon={<AlertTriangle className="h-6 w-6" />}
          maxWidth="max-w-lg"
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <SecondaryButton onClick={() => setCancelingTrip(null)}>رجوع</SecondaryButton>
              <PrimaryButton
                onClick={confirmCancel}
                disabled={!cancelPolicy.allowed}
                className="bg-rose-600 hover:bg-rose-700 shadow-rose-600/25"
              >
                أكد الإلغاء
              </PrimaryButton>
            </div>
          }
        >
          <div className="space-y-4">
            <RouteTimeline trip={cancelingTrip} />
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3 text-sm font-bold">
                  <span className="text-slate-500 dark:text-slate-400">قيمة الحجز الحالية</span>
                  <span className="text-slate-900 dark:text-white">{formatCurrency(cancelingTrip.finalTotal)}</span>
                </div>
                <div className="flex items-start justify-between gap-3 text-sm font-bold text-rose-700 dark:text-rose-300">
                  <span>رسوم الإلغاء ({Math.round(cancelPolicy.feeRatio * 100)}%)</span>
                  <span>- {formatCurrency(Math.round(cancelingTrip.finalTotal * cancelPolicy.feeRatio))}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3 text-base font-black text-emerald-700 dark:text-emerald-300">
                    <span>المبلغ المتوقع يرجع</span>
                    <span>{formatCurrency(cancelPolicy.refundAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
            <InlineNotice
              tone="warning"
              title="ملحوظة"
              text="بعد التأكيد، الرحلة هتتحول لحالة استرداد جاري لحد ما المعالجة تكتمل."
              icon={CheckCircle2}
            />
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

export default TripsView;
