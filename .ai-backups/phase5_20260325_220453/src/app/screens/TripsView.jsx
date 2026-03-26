import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Map,
  Ticket,
} from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
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

function getFeaturedTrip(trips) {
  return trips.find((trip) => ['upcoming', 'refund_pending'].includes(trip.status)) || null;
}

function getTripIdentity(trip) {
  return trip?.bookingId || trip?.pnr || trip?.id || null;
}

function BookingRow({ trip, isPendingCancellation, onViewTicket, onTrackTrip, onCancel }) {
  return (
    <AppSurface className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-black text-slate-900 dark:text-white">{trip.from} → {trip.to}</p>
            {isPendingCancellation ? (
              <StatusBadge label="استرداد جاري" tone="warning" />
            ) : trip.status === 'cancelled' ? (
              <StatusBadge label="ملغية" tone="danger" />
            ) : trip.status === 'past' ? (
              <StatusBadge label="منتهية" tone="neutral" />
            ) : (
              <StatusBadge label="مؤكدة" tone="success" />
            )}
          </div>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            {trip.date} · التحرك {trip.departureTime || '--:--'} · الوصول {trip.arrivalTime || '--:--'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <MetaChip label={`PNR ${trip.pnr || trip.id}`} tone="neutral" className="font-mono" />
            <MetaChip label={`المقاعد ${formatSeatsText(trip.selectedSeats)}`} tone="brand" />
            <MetaChip label={trip.class || 'اقتصادي مميز'} tone="neutral" />
            <MetaChip label={formatCurrency(trip.finalTotal || trip.price)} tone="success" />
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">
          <PrimaryButton onClick={() => onViewTicket(trip)} icon={<Ticket className="h-5 w-5" />}>افتح التذكرة</PrimaryButton>
          {trip.status === 'upcoming' ? (
            <SecondaryButton onClick={() => onTrackTrip?.(trip)} icon={<Map className="h-5 w-5" />}>متابعة الرحلة</SecondaryButton>
          ) : null}
          {trip.status === 'upcoming' ? (
            <SecondaryButton onClick={() => onCancel(trip)} className="text-rose-700 hover:border-rose-200 hover:bg-rose-50 dark:text-rose-300 dark:hover:border-rose-900">
              إلغاء الحجز
            </SecondaryButton>
          ) : null}
        </div>
      </div>
    </AppSurface>
  );
}

function TripsView({
  trips,
  _setMyTrips,
  processRefund,
  pendingCancellationBookingIds = [],
  onViewTicket,
  onTrackTrip,
  showToast,
}) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancelingTrip, setCancelingTrip] = useState(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);

  const computedTrips = useMemo(() => trips.map((trip) => withStationNames(trip)), [trips]);
  const featuredTrip = useMemo(() => getFeaturedTrip(computedTrips), [computedTrips]);
  const featuredTripId = getTripIdentity(featuredTrip);

  const counts = useMemo(
    () => ({
      upcoming: computedTrips.filter((trip) => ['upcoming', 'refund_pending'].includes(trip.status)).length,
      past: computedTrips.filter((trip) => trip.status === 'past').length,
      cancelled: computedTrips.filter((trip) => trip.status === 'cancelled').length,
    }),
    [computedTrips],
  );

  const filteredTrips = useMemo(
    () => computedTrips.filter((trip) => {
      if (activeTab === 'upcoming') return ['upcoming', 'refund_pending'].includes(trip.status);
      if (activeTab === 'past') return trip.status === 'past';
      return trip.status === 'cancelled';
    }),
    [activeTab, computedTrips],
  );

  useEffect(() => {
    if (!cancelingTrip) {
      setIsCancelSubmitting(false);
    }
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

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="رحلاتي"
        title="إدارة الحجوزات"
        subtitle="هنا تراجع حالة الحجز وتعديله أو إلغاؤه. أما فتح التذكرة السريع فله صفحة مستقلة."
      />

      {featuredTrip ? (
        <AppSurface className="overflow-hidden p-5 sm:p-6">
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">الحجز الجاري</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{featuredTrip.from} → {featuredTrip.to}</h2>
              <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                {featuredTrip.date} · التحرك {featuredTrip.departureTime || '--:--'} · الوصول {featuredTrip.arrivalTime || '--:--'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <MetaChip label={`PNR ${featuredTrip.pnr || featuredTrip.id}`} tone="neutral" className="font-mono" />
                <MetaChip label={`المقاعد ${formatSeatsText(featuredTrip.selectedSeats)}`} tone="brand" />
                <MetaChip label={featuredTrip.class || 'اقتصادي مميز'} tone="neutral" />
                <MetaChip label={formatCurrency(featuredTrip.finalTotal || featuredTrip.price)} tone="success" />
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton onClick={() => onViewTicket(featuredTrip)}>افتح التذكرة</PrimaryButton>
                <SecondaryButton onClick={() => onTrackTrip?.(featuredTrip)} icon={<Map className="h-5 w-5" />}>متابعة الرحلة</SecondaryButton>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">حالة الحجز</p>
                <p className="mt-2 text-base font-black text-slate-900 dark:text-white">{featuredTrip.status === 'refund_pending' ? 'استرداد جاري' : 'مؤكد'}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">لو الهدف الصعود السريع، استخدم صفحة التذاكر. ولو عايز إدارة الحجز أو الإلغاء، خليك هنا.</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">الإلغاء</p>
                <p className="mt-2 text-base font-black text-slate-900 dark:text-white">{getCancellationPolicy(featuredTrip).allowed ? 'متاح الآن' : 'غير متاح'}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">الرسوم والمبلغ المتوقع رجوعه يظهران بوضوح قبل أي تأكيد.</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">التالي</p>
                <p className="mt-2 text-base font-black text-slate-900 dark:text-white">التذكرة والمتابعة</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">بعد تأكيد الحجز، أسهل وصول للتذكرة وQR والمتابعة سيكون من صفحة التذاكر.</p>
              </div>
            </div>
          </div>
        </AppSurface>
      ) : (
        <InlineNotice tone="neutral" title="لا توجد رحلة قادمة الآن" text="أول حجز مؤكد سيظهر هنا بشكل مبسط وواضح." />
      )}

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
              ? 'لا توجد رحلات قادمة'
              : activeTab === 'past'
              ? 'مفيش رحلات سابقة محفوظة'
              : 'مفيش رحلات ملغية'
          }
          text={
            activeTab === 'upcoming'
              ? 'أول رحلة مؤكدة هتظهر هنا تلقائيًا.'
              : activeTab === 'past'
              ? 'بعد انتهاء أي رحلة هتنتقل للقائمة دي.'
              : 'أي رحلة يتم إلغاؤها ستظهر هنا مع حالة الاسترداد.'
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredTrips.map((trip) => {
            const bookingId = trip.bookingId || trip.id || null;
            const isPendingCancellation =
              trip.status === 'refund_pending' ||
              (bookingId && pendingCancellationBookingIds.includes(bookingId));

            return (
              <BookingRow
                key={trip.pnr || trip.id}
                trip={trip}
                isPendingCancellation={isPendingCancellation}
                onViewTicket={onViewTicket}
                onTrackTrip={onTrackTrip}
                onCancel={setCancelingTrip}
              />
            );
          })}
        </div>
      )}

      {cancelingTrip ? (
        <ModalShell
          title="تأكيد إلغاء الحجز"
          subtitle="راجع الرسوم والمبلغ المتوقع رجوعه قبل ما تكمل."
          onClose={() => setCancelingTrip(null)}
          icon={<AlertTriangle className="h-6 w-6" />}
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <SecondaryButton onClick={() => setCancelingTrip(null)} disabled={isCancelSubmitting}>
                رجوع
              </SecondaryButton>
              <PrimaryButton onClick={confirmCancel} disabled={!cancelPolicy?.allowed} loading={isCancelSubmitting} loadingText="جاري الإلغاء…">
                أكد الإلغاء
              </PrimaryButton>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                  <span>قيمة الحجز</span>
                  <span>{formatCurrency(cancelingTrip.finalTotal)}</span>
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
