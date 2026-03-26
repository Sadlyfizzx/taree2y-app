import { Clock3, QrCode, Route, Ticket } from 'lucide-react';
import RouteTimeline from '../components/ui/RouteTimeline';
import {
  AppSurface,
  MetaChip,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
} from '../components/ui/AppPrimitives';
import { EmptyStateCard } from '../components/ui/StateBlocks';
import { formatSeatsText } from '../utils/formatting';
import { withStationNames } from '../utils/stations';

export default function TicketsHubView({ tickets, onOpenTicket, onTrackTicket }) {
  const preparedTickets = (Array.isArray(tickets) ? tickets : [])
    .map((ticket) => withStationNames(ticket))
    .filter((ticket) => ['upcoming', 'refund_pending'].includes(ticket?.status));

  return (
    <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom)+118px)] md:pb-0">
      <PageHeading
        eyebrow="التذاكر"
        title="التذاكر الجاهزة للسفر"
        subtitle="افتح التذكرة أو التتبع بسرعة، وراجع المحطة والمقاعد قبل وقت التحرك."
      />

      {preparedTickets.length === 0 ? (
        <EmptyStateCard
          icon={Ticket}
          title="لسه مفيش تذاكر جاهزة"
          text="أول ما تكمل حجز حقيقي، التذكرة هتظهر هنا فورًا مع الوصول السريع للتفاصيل والـ QR."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {preparedTickets.map((ticket) => {
            const isRefundPending = ticket.status === 'refund_pending';
            return (
              <AppSurface
                key={ticket.bookingId || ticket.id || ticket.pnr}
                className="group flex h-full min-w-0 flex-col overflow-hidden p-4 md:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black tracking-[0.16em] text-[var(--ink-soft)]">بطاقة الصعود</p>
                    <h3 className="mt-2 text-lg font-black text-[var(--ink)]">
                      {ticket.from} إلى {ticket.to}
                    </h3>
                  </div>
                  <MetaChip
                    label={isRefundPending ? 'استرداد جاري' : 'جاهزة'}
                    tone={isRefundPending ? 'warning' : 'success'}
                  />
                </div>

                <div className="app-brand-panel mt-4 rounded-[28px] p-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black tracking-[0.16em] text-white/65">رقم الحجز</p>
                      <p className="mt-1 font-mono text-sm font-black">{ticket.pnr || ticket.bookingId || ticket.id}</p>
                    </div>
                    <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-white/12 text-white ring-1 ring-white/10">
                      <QrCode className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-white/85">
                    <span className="rounded-full bg-white/10 px-3 py-2">المقاعد: {formatSeatsText(ticket.selectedSeats)}</span>
                    <span className="rounded-full bg-white/10 px-3 py-2">{ticket.departureTime}</span>
                    <span className="rounded-full bg-white/10 px-3 py-2">{ticket.fromStationName}</span>
                  </div>
                </div>

                <RouteTimeline trip={ticket} compact className="mt-4 p-0" />

                <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] font-black text-[var(--ink-muted)] md:gap-3 md:text-xs">
                  <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-3 text-center">
                    <QrCode className="mx-auto h-4 w-4 text-[var(--brand-strong)] dark:text-[var(--brand)]" />
                    <p className="mt-2">QR جاهز</p>
                  </div>
                  <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-3 text-center">
                    <Route className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    <p className="mt-2">تتبع مباشر</p>
                  </div>
                  <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-3 text-center">
                    <Clock3 className="mx-auto h-4 w-4 text-amber-600 dark:text-amber-300" />
                    <p className="mt-2">جاهزة للسفر</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <PrimaryButton className="flex-1" onClick={() => onOpenTicket?.(ticket)} icon={<QrCode className="h-4 w-4" />}>
                    افتح التذكرة
                  </PrimaryButton>
                  <SecondaryButton className="flex-1" onClick={() => onTrackTicket?.(ticket)} icon={<Route className="h-4 w-4" />}>
                    متابعة الرحلة
                  </SecondaryButton>
                </div>
              </AppSurface>
            );
          })}
        </div>
      )}
    </div>
  );
}
