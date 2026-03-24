import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  FileText,
  Loader2,
  Map,
  QrCode,
} from 'lucide-react';
import RouteTimeline from '../components/ui/RouteTimeline';
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
import {
  downloadTicketPdf,
  downloadTicketPng,
  generateTicketQrDataUrl,
  makeSafeFileName,
  parseTicketQrPayload,
} from '../../lib/ticketArtifacts';

function TicketView({ ticket, user, onTrack, showToast }) {
  if (!ticket) return null;

  const data = withStationNames(ticket);
  const ticketRef = useRef(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [exporting, setExporting] = useState('');

  const isPast = data.status === 'past';
  const isCancelled = data.status === 'cancelled';
  const isRefundPending = data.status === 'refund_pending';

  const qrMeta = useMemo(
    () => parseTicketQrPayload(data.qrPayload || data.qr_payload, data),
    [data],
  );

  const fileBaseName = useMemo(
    () => makeSafeFileName(`taree2y-ticket-${data.pnr || data.tripCode || data.id || 'booking'}`),
    [data.id, data.pnr, data.tripCode],
  );

  useEffect(() => {
    let active = true;

    generateTicketQrDataUrl(qrMeta)
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [qrMeta]);

  const handleDownloadPng = async () => {
    try {
      setExporting('png');
      await downloadTicketPng({
        node: ticketRef.current,
        fileName: `${fileBaseName}.png`,
      });
      showToast('تم حفظ نسخة PNG من التذكرة.', 'success');
    } catch (error) {
      showToast('تعذر حفظ نسخة PNG من التذكرة.', 'error');
    } finally {
      setExporting('');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setExporting('pdf');
      await downloadTicketPdf({
        node: ticketRef.current,
        fileName: `${fileBaseName}.pdf`,
      });
      showToast('تم حفظ نسخة PDF من التذكرة.', 'success');
    } catch (error) {
      showToast('تعذر حفظ نسخة PDF من التذكرة.', 'error');
    } finally {
      setExporting('');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="التذكرة"
        title="كل تفاصيل الرحلة قدامك"
        subtitle="اسم المحطة، وقت التحرك، المقاعد، والـ QR كلهم في شاشة واحدة سهلة وقت السفر."
        actions={
          <div className="flex gap-2">
            {isRefundPending ? <StatusBadge label="استرداد جاري" tone="warning" /> : null}
            {isCancelled ? <StatusBadge label="ملغية" tone="danger" /> : null}
            {isPast ? <StatusBadge label="منتهية" tone="neutral" /> : null}
            {!isPast && !isCancelled && !isRefundPending ? <StatusBadge label="صالحة للصعود" tone="success" /> : null}
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

      <div ref={ticketRef} className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <AppSurface className="ticket-shell overflow-hidden p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">رقم الحجز</p>
              <p className="mt-1 font-mono text-2xl font-black text-slate-900 dark:text-white">{data.pnr || data.id}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <MetaChip label={`التاريخ ${data.date}`} tone="brand" />
              {data.tripCode ? <MetaChip label={data.tripCode} tone="neutral" /> : null}
            </div>
          </div>

          <div className="mt-4">
            <RouteTimeline trip={data} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <KeyValueRow label="اسم الراكب" value={user.name} />
            <KeyValueRow label="المقاعد" value={formatSeatsText(data.selectedSeats)} valueClassName="font-black text-indigo-700 dark:text-indigo-300" />
            <KeyValueRow label="الشركة" value={data.company} />
            <KeyValueRow label="الدرجة" value={data.class} />
            <KeyValueRow label="الدفع" value={data.paymentMethod === 'wallet' ? 'محفظة طريقي' : data.paymentMethod} />
            <KeyValueRow label="إجمالي العملية" value={formatCurrency(data.finalTotal || data.price)} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <MetaChip label={data.luggage ? 'فيه وزن إضافي' : 'شنطة 20 كجم مشمولة'} tone={data.luggage ? 'warning' : 'neutral'} />
            {data.ride ? <MetaChip label="توصيلة للمحطة مضافة" tone="brand" /> : null}
            {data.access ? <MetaChip label="مساعدة وقت الصعود" tone="success" /> : null}
          </div>
        </AppSurface>

        <AppSurface className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
              <QrCode className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">رمز الصعود</h3>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">اعرضه وقت الركوب مع رقم الحجز لو الموظف طلبه.</p>
            </div>
          </div>

          <div className={`mt-5 rounded-[28px] border border-dashed border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-950 ${isPast || isCancelled ? 'opacity-60' : ''}`}>
            <div className="mx-auto flex min-h-[176px] w-full max-w-[176px] items-center justify-center rounded-[28px] border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR التذكرة" className="h-40 w-40 rounded-[22px] object-contain" />
              ) : (
                <QrCode className="h-24 w-24 text-slate-900 dark:text-white" />
              )}
            </div>
            <p className="mt-4 text-sm font-black text-slate-900 dark:text-white">{data.ticketToken || 'رمز التذكرة غير متاح'}</p>
            <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">لو الشبكة ضعفت، رقم الحجز يفضل ظاهر معاك في أعلى الشاشة.</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <KeyValueRow label="مرجع الحجز" value={qrMeta.booking_ref || data.pnr || '—'} />
            <KeyValueRow label="كود الرحلة" value={qrMeta.trip_code || data.tripCode || '—'} />
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-sm font-black text-slate-900 dark:text-white">ملحوظة قبل التحرك</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
              حاول توصل المحطة قبل التحرك بـ 20 دقيقة على الأقل عشان الصعود يبقى هادي وواضح.
            </p>
          </div>
        </AppSurface>
      </div>

      <StickyActionBar>
        <AppSurface className="flex flex-col gap-3 p-4">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">احفظ نسخة من التذكرة على الموبايل أو الكمبيوتر</p>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">متاح دلوقتي حفظ PNG أو PDF بجانب فتح تتبع الرحلة.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <PrimaryButton onClick={onTrack} disabled={isPast || isCancelled} icon={<Map className="h-5 w-5" />} className="sm:flex-1">
              متابعة الرحلة
            </PrimaryButton>
            <SecondaryButton onClick={handleDownloadPng} disabled={exporting !== ''} icon={exporting === 'png' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />} className="sm:flex-1">
              حفظ PNG
            </SecondaryButton>
            <SecondaryButton onClick={handleDownloadPdf} disabled={exporting !== ''} icon={exporting === 'pdf' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />} className="sm:flex-1">
              حفظ PDF
            </SecondaryButton>
          </div>
        </AppSurface>
      </StickyActionBar>
    </div>
  );
}

export default TicketView;
