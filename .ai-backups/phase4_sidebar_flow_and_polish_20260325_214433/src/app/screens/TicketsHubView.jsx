import React, { useMemo, useState } from 'react';
import { Clock, QrCode, Ticket } from 'lucide-react';
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
import { formatSeatsText } from '../utils/formatting';
import { withStationNames } from '../utils/stations';

export default function TicketsHubView({ trips = [], onOpenTicket, onTrackTicket, pendingCancellationBookingIds = [] }) {
  const [activeTab, setActiveTab] = useState('ready');

  const preparedTrips = useMemo(() => trips.map((trip) => withStationNames(trip)), [trips]);

  const counts = useMemo(
    () => ({
      ready: preparedTrips.filter((trip) => ['upcoming', 'refund_pending'].includes(trip.status)).length,
      archived: preparedTrips.filter((trip) => trip.status === 'past').length,
      cancelled: preparedTrips.filter((trip) => trip.status === 'cancelled').length,
    }),
    [preparedTrips],
  );

  const filteredTrips = useMemo(() => {
    if (activeTab === 'ready') return preparedTrips.filter((trip) => ['upcoming', 'refund_pending'].includes(trip.status));
    if (activeTab === 'archived') return preparedTrips.filter((trip) => trip.status === 'past');
    return preparedTrips.filter((trip) => trip.status === 'cancelled');
  }, [activeTab, preparedTrips]);

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="التذاكر"
        title="الوصول للتذكرة لازم يكون أسرع من أي شيء"
        subtitle="هنا تفتح التذكرة أو الـ QR أو متابعة الرحلة من غير ما تدور داخل صفحة إدارة الحجوزات."
      />

      <InlineNotice
        tone="info"
        title="جاهزية الصعود"
        text="لو الرحلة جاية، افتح التذكرة مباشرة. ولو قرب الميعاد استخدم متابعة الرحلة من نفس المكان."
      />

      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ready', label: `جاهزة (${counts.ready})` },
          { key: 'archived', label: `سابقة (${counts.archived})` },
          { key: 'cancelled', label: `ملغية (${counts.cancelled})` },
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
          title={activeTab === 'ready' ? 'لا توجد تذاكر جاهزة الآن' : activeTab === 'archived' ? 'لا توجد تذاكر محفوظة هنا' : 'لا توجد تذاكر ملغية'}
          text={activeTab === 'ready' ? 'أول رحلة مؤكدة ستظهر هنا فور إصدار التذكرة.' : 'عند وجود تذاكر في هذا القسم ستظهر هنا بشكل منظم.'}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredTrips.map((trip) => {
            const bookingId = trip.bookingId || trip.id || null;
            const isPendingCancellation =
              trip.status === 'refund_pending' ||
              (bookingId && pendingCancellationBookingIds.includes(bookingId));

            return (
              <AppSurface key={trip.pnr || trip.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">PNR</p>
                    <p className="mt-1 font-mono text-sm font-black text-slate-900 dark:text-white">{trip.pnr || trip.id}</p>
                  </div>
                  {isPendingCancellation ? (
                    <StatusBadge label="استرداد جاري" tone="warning" />
                  ) : trip.status === 'cancelled' ? (
                    <StatusBadge label="ملغية" tone="danger" />
                  ) : trip.status === 'past' ? (
                    <StatusBadge label="منتهية" tone="neutral" />
                  ) : (
                    <StatusBadge label="جاهزة للصعود" tone="success" />
                  )}
                </div>

                <div className="mt-4">
                  <RouteTimeline trip={trip} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <MetaChip label={`المقاعد: ${formatSeatsText(trip.selectedSeats)}`} tone="neutral" />
                  {trip.status === 'upcoming' ? <MetaChip label="التذكرة فعالة" tone="success" /> : null}
                  {trip.status === 'past' ? <MetaChip label="للمراجعة فقط" tone="neutral" /> : null}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <PrimaryButton onClick={() => onOpenTicket?.(trip)} className="flex-1" icon={<QrCode className="h-5 w-5" />}>
                    افتح التذكرة
                  </PrimaryButton>
                  {trip.status === 'upcoming' ? (
                    <SecondaryButton onClick={() => onTrackTicket?.(trip)} className="flex-1" icon={<Clock className="h-5 w-5" />}>
                      متابعة الرحلة
                    </SecondaryButton>
                  ) : null}
                </div>
              </AppSurface>
            );
          })}
        </div>
      )}
    </div>
  );
}
