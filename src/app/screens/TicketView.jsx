import React, { useMemo, useState } from 'react';
import { Download, Map, Link2 } from 'lucide-react';
import RouteTimeline from '../components/ui/RouteTimeline';
import PrettyQrCard from '../components/ui/PrettyQrCard';
import {
  AppSurface,
  KeyValueRow,
  MetaChip,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
  StickyActionBar,
  StatusBadge,
} from '../components/ui/AppPrimitives';
import { InlineNotice } from '../components/ui/StateBlocks';
import { formatCurrency, formatSeatsText } from '../utils/formatting';
import { withStationNames } from '../utils/stations';
import { createPublicTripShare, copyTextWithFallback } from '../public/publicPortal';
import { buildTripPublicTrackingUrl } from '../utils/share';
import { exportTicketPdf, exportTicketPng } from '../utils/ticketExport';

function TicketView({ ticket, user, onTrack, showToast }) {
  const data = useMemo(() => withStationNames(ticket) || {}, [ticket]);
  const isPast = data.status === 'past';
  const isCancelled = data.status === 'cancelled';
  const isRefundPending = data.status === 'refund_pending';

  const ticketKey =
    data.bookingId ||
    data.id ||
    data.pnr ||
    data.publicTripCode ||
    data.ticketToken ||
    'ticket';

  const [shareState, setShareState] = useState({ key: '', url: '' });
  const [busyAction, setBusyAction] = useState('');

  const persistedTrackingUrl = buildTripPublicTrackingUrl(data);
  const cachedTrackingUrl =
    shareState.key === ticketKey && shareState.url ? shareState.url : '';
  const trackingUrl = cachedTrackingUrl || persistedTrackingUrl;

  const sharePayload = useMemo(
    () => ({
      v: 2,
      publicTripCode: data.publicTripCode || data.tripCode || data.id || data.pnr || null,
      driverRunCode: data.driverRunCode || null,
      pnr: data.pnr || null,
      from: data.from,
      to: data.to,
      fromStationName: data.fromStationName,
      toStationName: data.toStationName,
      date: data.date,
      departureTime: data.departureTime,
      arrivalTime: data.arrivalTime,
      durationHour: data.durationHour,
      company: data.company,
      class: data.class,
      driver: data.driver || null,
      hasRestStop: Boolean(data.hasRestStop),
      luggage: Boolean(data.luggage),
      access: Boolean(data.access),
      issuedAt: Date.now(),
    }),
    [
      data.access,
      data.arrivalTime,
      data.class,
      data.company,
      data.date,
      data.departureTime,
      data.driver,
      data.driverRunCode,
      data.durationHour,
      data.from,
      data.fromStationName,
      data.hasRestStop,
      data.id,
      data.luggage,
      data.pnr,
      data.publicTripCode,
      data.to,
      data.toStationName,
      data.tripCode,
    ],
  );

  const qrValue = trackingUrl || data.qrPayload || data.ticketToken || data.pnr || '';

  if (!ticket) return null;

  const ensureTrackingUrl = async () => {
    if (trackingUrl) return trackingUrl;

    const share = await createPublicTripShare(sharePayload);
    const nextUrl = String(share?.url || '').trim();

    if (!nextUrl) {
      throw new Error('missing_tracking_url');
    }

    setShareState({ key: ticketKey, url: nextUrl });
    return nextUrl;
  };

  const saveTicket = async (kind) => {
    if (busyAction) return;

    const actionKey = kind === 'pdf' ? 'pdf' : 'png';
    setBusyAction(actionKey);
    try {
      if (kind === 'pdf') {
        await exportTicketPdf({ ticket: data, user });
      } else {
        await exportTicketPng({ ticket: data, user });
      }
      showToast(kind === 'pdf' ? 'تم حفظ التذكرة PDF.' : 'تم حفظ التذكرة PNG.', 'success');
    } catch {
      showToast('تعذر حفظ التذكرة حالياً.', 'error');
    } finally {
      setBusyAction('');
    }
  };

  const copyTrackingLink = async () => {
    if (busyAction) return;
    setBusyAction('copy');
    try {
      const url = await ensureTrackingUrl();
      const copied = await copyTextWithFallback(url, 'رابط المتابعة');
      showToast(
        copied ? 'تم نسخ رابط المتابعة.' : 'تعذر نسخ رابط المتابعة حالياً.',
        copied ? 'success' : 'error',
      );
    } catch {
      showToast('تعذر نسخ رابط المتابعة حالياً.', 'error');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="app-page-frame min-w-0 overflow-x-clip space-y-5 pb-[calc(env(safe-area-inset-bottom)+118px)] md:pb-0">
      <PageHeading
        eyebrow="التذكرة"
        title="كل تفاصيل الرحلة قدامك"
        subtitle="اسم المحطة، وقت التحرك، المقاعد، والـ QR في شاشة واحدة واضحة وقت السفر."
        actions={
          <div className="flex flex-wrap gap-2">
            {isRefundPending ? <StatusBadge label="استرداد جاري" tone="warning" /> : null}
            {isCancelled ? <StatusBadge label="ملغية" tone="danger" /> : null}
            {isPast ? <StatusBadge label="منتهية" tone="neutral" /> : null}
            {!isPast && !isCancelled && !isRefundPending ? (
              <StatusBadge label="صالحة للصعود" tone="success" />
            ) : null}
          </div>
        }
      />

      {isCancelled || isRefundPending ? (
        <InlineNotice
          tone={isCancelled ? 'danger' : 'warning'}
          title={isCancelled ? 'التذكرة دي اتلغت' : 'التذكرة في انتظار تأكيد الاسترداد'}
          text={
            isCancelled
              ? 'تم إلغاء الرحلة، ولو فيه مبلغ مسترد هتلاقيه في المحفظة وحركات الرصيد.'
              : 'الرحلة مازالت ظاهرة عشان تراجع التفاصيل لحد ما معالجة الاسترداد تخلص.'
          }
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <AppSurface className="app-ticket-shell min-w-0 overflow-hidden p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-[var(--ink-soft)]">رقم الحجز</p>
              <p className="mt-1 break-words font-mono text-xl font-black text-[var(--ink)] md:text-2xl">
                {data.pnr || data.id}
              </p>
            </div>
            <MetaChip label={`التاريخ ${data.date}`} tone="brand" />
          </div>

          <div className="mt-4">
            <RouteTimeline trip={data} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <KeyValueRow label="اسم الراكب" value={user.name} />
            <KeyValueRow label="المقاعد" value={formatSeatsText(data.selectedSeats)} valueClassName="font-black text-[var(--brand-strong)] dark:text-[var(--brand)]" />
            <KeyValueRow label="الشركة" value={data.company} />
            <KeyValueRow label="الدرجة" value={data.class} />
            <KeyValueRow label="الدفع" value={data.paymentMethod === 'wallet' ? 'محفظة طريقي' : data.paymentMethod} />
            <KeyValueRow label="إجمالي العملية" value={formatCurrency(data.finalTotal || data.price)} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <MetaChip label={data.luggage ? 'فيه وزن إضافي' : 'شنطة 20 كجم مشمولة'} tone={data.luggage ? 'warning' : 'neutral'} />
            {data.access ? <MetaChip label="مساعدة وقت الصعود" tone="success" /> : null}
            <MetaChip label={data.fromStationName} tone="brand" />
          </div>

          <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-4">
            <p className="text-sm font-black text-[var(--ink)]">قبل السفر</p>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink-muted)]">
              يفضّل توصل المحطة قبل التحرك بـ 20 دقيقة على الأقل، وتتأكد إن اسم المحطة على التذكرة هو نفس مكان الصعود.
            </p>
          </div>
        </AppSurface>

        <div className="space-y-5">
          <PrettyQrCard
            value={qrValue}
            title="QR التذكرة والمتابعة"
            subtitle="امسح الكود أو افتح الرابط مباشرة وقت السفر أو للمشاركة."
            chipLabel={data.driverRunCode || data.publicTripCode || 'رحلة طريقي'}
            codeLabel="رابط المتابعة"
          />

          <AppSurface className="p-4 md:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <PrimaryButton
                onClick={() => saveTicket('pdf')}
                icon={<Download className="h-5 w-5" />}
                className="w-full justify-center"
                disabled={Boolean(busyAction && busyAction !== 'pdf')}
                loading={busyAction === 'pdf'}
                loadingText="جاري تجهيز PDF…"
              >
                حفظ PDF
              </PrimaryButton>
              <SecondaryButton
                onClick={() => saveTicket('png')}
                icon={<Download className="h-5 w-5" />}
                className="w-full justify-center"
                disabled={Boolean(busyAction && busyAction !== 'png')}
                loading={busyAction === 'png'}
                loadingText="جاري تجهيز PNG…"
              >
                حفظ PNG
              </SecondaryButton>
              <SecondaryButton
                onClick={copyTrackingLink}
                icon={<Link2 className="h-5 w-5" />}
                className="w-full justify-center sm:col-span-2 xl:col-span-1"
                disabled={Boolean(busyAction && busyAction !== 'copy')}
                loading={busyAction === 'copy'}
                loadingText="جاري تجهيز الرابط…"
              >
                نسخ رابط المتابعة
              </SecondaryButton>
            </div>
          </AppSurface>
        </div>
      </div>

      <StickyActionBar>
        <AppSurface className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-[var(--ink)]">لو الرحلة قربت تتحرك افتح التتبع</p>
            <p className="mt-1 text-sm font-bold text-[var(--ink-muted)]">
              هتشوف حالة الرحلة والمستجدات من نفس التطبيق.
            </p>
          </div>
          <PrimaryButton onClick={onTrack} disabled={isPast || isCancelled} icon={<Map className="h-5 w-5" />} className="w-full sm:w-auto sm:min-w-[240px]">
            متابعة الرحلة
          </PrimaryButton>
        </AppSurface>
      </StickyActionBar>
    </div>
  );
}

export default TicketView;
