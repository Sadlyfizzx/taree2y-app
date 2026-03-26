import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Map,
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

function getFeaturedTrip(trips) {
  return trips.find((trip) => ['upcoming', 'refund_pending'].includes(trip.status)) || null;
}

function getTripIdentity(trip) {
  return trip?.bookingId || trip?.pnr || trip?.id || null;
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
      const tripId = getTripIdentity(trip);
      if (activeTab === 'upcoming') {
        if (!['upcoming', 'refund_pending'].includes(trip.status)) return false;
        return !(featuredTripId && tripId && tripId === featuredTripId);
      }
      if (activeTab === 'past') return trip.status === 'past';
      return trip.status === 'cancelled';
    }),
    [activeTab, computedTrips, featuredTripId],
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
        title="الإدارة الكاملة للحجز في مكان واحد"
        subtitle="هنا النسخة الكاملة من لوحة رحلتك، ثم تحتها كل الحجوزات السابقة والملغية بشكل مرتب."
      />

      {featuredTrip ? (
        <section className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] p-6 text-white shadow-[0_30px_60px_-36px_rgba(16,35,63,0.6)]">
          <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.24), transparent 28%), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: 'auto, 24px 24px, 24px 24px' }} />
          <div className="relative z-10 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-white/70">لوحة رحلتك</p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
                {featuredTrip.from} → {featuredTrip.to}
              </h2>
              <p className="mt-2 text-sm font-bold text-white/80">
                {featuredTrip.date} · التحرك {featuredTrip.departureTime || '--:--'} · الوصول {featuredTrip.arrivalTime || '--:--'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <MetaChip label={`المقاعد ${formatSeatsText(featuredTrip.selectedSeats)}`} tone="brand" className="border-white/15 bg-white/10 text-white" />
                <MetaChip label={featuredTrip.status === 'refund_pending' ? 'استرداد جاري' : 'مؤكدة'} tone="brand" className="border-white/15 bg-white/10 text-white" />
                <MetaChip label={formatCurrency(featuredTrip.finalTotal || featuredTrip.price)} tone="brand" className="border-white/15 bg-white/10 text-white" />
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton onClick={() => onViewTicket(featuredTrip)} className="!bg-white !text-indigo-700 hover:!bg-indigo-50 shadow-none">
                  افتح التذكرة
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => onTrackTrip?.(featuredTrip)}
                  icon={<Map className="h-5 w-5" />}
                  className="border-white/20 bg-white/10 text-white hover:bg-white/15 dark:border-white/20 dark:bg-white/10 dark:text-white"
                >
                  متابعة الرحلة
                </SecondaryButton>
              </div>
            </div>

            <AppSurface className="border-white/10 bg-white/95 p-5 dark:border-slate-800 dark:bg-slate-950/95">
              <p className="text-sm font-black text-slate-900 dark:text-white">ملخص الرحلة الحالية</p>
              <div className="mt-4">
                <RouteTimeline trip={featuredTrip} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-xs font-black text-slate-400 dark:text-slate-500">رقم الحجز</p>
                  <p className="mt-2 font-mono text-sm font-black text-slate-900 dark:text-white">{featuredTrip.pnr || featuredTrip.id}</p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-xs font-black text-slate-400 dark:text-slate-500">الدرجة</p>
                  <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">{featuredTrip.class || 'اقتصادي مميز'}</p>
                </div>
              </div>
            </AppSurface>
          </div>
        </section>
      ) : (
        <InlineNotice
          tone="neutral"
          title="لا توجد رحلة قادمة الآن"
          text="أول رحلة مؤكدة ستظهر هنا بلوحة أوضح وأغنى من الرئيسية."
        />
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
              ? 'لا توجد رحلات أخرى قادمة'
              : activeTab === 'past'
              ? 'مفيش رحلات سابقة محفوظة'
              : 'مفيش رحلات ملغية'
          }
          text={
            activeTab === 'upcoming'
              ? 'لو عندك رحلة قادمة فهي ظاهرة في أعلى الصفحة، وباقي الحجوزات ستظهر هنا.'
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
          onClose={() => {
            if (isCancelSubmitting) return;
            setCancelingTrip(null);
          }}
          title="تأكيد إلغاء الرحلة"
          subtitle="راجع الرسوم والمبلغ المتوقع يرجع للمحفظة."
          icon={<AlertTriangle className="h-6 w-6" />}
          maxWidth="max-w-lg"
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <SecondaryButton onClick={() => setCancelingTrip(null)} disabled={isCancelSubmitting}>رجوع</SecondaryButton>
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
