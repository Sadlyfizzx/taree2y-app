import React, { useMemo, useState } from 'react';
import {
  Copy,
  Download,
  FileText,
  Map,
} from 'lucide-react';
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
import { ensureTicketIdentity } from '../utils/tripIdentity';
import { buildPublicTripUrl, copyShareUrl } from '../utils/publicTripSharing';
import { exportTicketAsImage, exportTicketAsPdf } from '../utils/ticketExport';

function TicketView({ ticket, user, onTrack, showToast }) {
  const [exporting, setExporting] = useState(null);

  if (!ticket) return null;

  const data = ensureTicketIdentity(withStationNames(ticket));
  const shareUrl = useMemo(() => buildPublicTripUrl(data), [data]);
  const isPast = data.status === 'past';
  const isCancelled = data.status === 'cancelled';
  const isRefundPending = data.status === 'refund_pending';

  const handleExport = async (mode) => {
    if (!shareUrl) {
      showToast('تعذر تجهيز رابط المتابعة للتصدير.', 'error');
      return;
    }

    setExporting(mode);
    try {
      if (mode === 'image') {
        await exportTicketAsImage({ ticket: data, user, shareUrl });
        showToast('تم تنزيل نسخة صورة حديثة من التذكرة.', 'success');
      } else {
        await exportTicketAsPdf({ ticket: data, user, shareUrl });
        showToast('تم تنزيل نسخة PDF حديثة من التذكرة.', 'success');
      }
    } catch (error) {
      showToast('حصلت مشكلة أثناء تجهيز ملف التصدير.', 'error');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="التذكرة"
        title="نسخة أوضح وأقرب لشكل المنتج"
        subtitle="الكود الظاهر بقى مفيد وواضح، والـ QR بيفتح صفحة متابعة عامة حديثة بدل الرموز الطويلة غير المفهومة."
        actions={
          <div className="flex flex-wrap gap-2">
            {isRefundPending ? <StatusBadge label="استرداد جاري" tone="warning" /> : null}
            {isCancelled ? <StatusBadge label="ملغية" tone="danger" /> : null}
            {isPast ? <StatusBadge label="منتهية" tone="neutral" /> : null}
            {!isPast && !isCancelled && !isRefundPending ? <StatusBadge label="صالحة للصعود" tone="success" /> : null}
          </div>
        }
      />

      {(isCancelled || isRefundPending) ? (
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

      <section className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] px-6 py-6 text-white shadow-[0_30px_60px_-36px_rgba(16,35,63,0.6)]">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.24), transparent 24%), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: 'auto, 24px 24px, 24px 24px' }} />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-white/70">الكود المعروض للراكب</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">{data.publicTripCode}</h2>
            <p className="mt-3 text-sm font-bold text-white/80">وده كود الموظف / السواق: {data.driverRunCode}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <MetaChip label={`PNR ${data.pnr || '—'}`} tone="brand" className="border-white/15 bg-white/10 text-white" />
              <MetaChip label={`المقاعد ${formatSeatsText(data.selectedSeats)}`} tone="brand" className="border-white/15 bg-white/10 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SecondaryButton
              onClick={async () => {
                const copied = await copyShareUrl(shareUrl);
                showToast(copied ? 'تم نسخ رابط متابعة الرحلة.' : 'تعذر نسخ الرابط تلقائيًا.', copied ? 'success' : 'error');
              }}
              icon={<Copy className="h-4 w-4" />}
              className="border-white/15 bg-white/10 text-white hover:bg-white/15 dark:border-white/15 dark:bg-white/10 dark:text-white"
            >
              انسخ رابط المتابعة
            </SecondaryButton>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
        <AppSurface className="ticket-shell overflow-hidden p-5">
          <RouteTimeline trip={data} />

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <KeyValueRow label="اسم الراكب" value={user.name} />
            <KeyValueRow label="المقاعد" value={formatSeatsText(data.selectedSeats)} valueClassName="font-black text-indigo-700 dark:text-indigo-300" />
            <KeyValueRow label="الشركة" value={data.company} />
            <KeyValueRow label="الدرجة" value={data.class} />
            <KeyValueRow label="كود الرحلة" value={data.publicTripCode} />
            <KeyValueRow label="كود التشغيل" value={data.driverRunCode} />
            <KeyValueRow label="الدفع" value={data.paymentMethod === 'wallet' ? 'محفظة طريقي' : data.paymentMethod} />
            <KeyValueRow label="إجمالي العملية" value={formatCurrency(data.finalTotal || data.price)} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <MetaChip label={data.luggage ? 'فيه وزن إضافي' : 'شنطة 20 كجم مشمولة'} tone={data.luggage ? 'warning' : 'neutral'} />
            {data.ride ? <MetaChip label="توصيلة للمحطة مضافة" tone="brand" /> : null}
            {data.access ? <MetaChip label="مساعدة وقت الصعود" tone="success" /> : null}
          </div>

          <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/60">
            <p className="text-sm font-black text-slate-900 dark:text-white">ليه الكود ده أفضل؟</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
              بدل الأكواد الطويلة العشوائية، بقى عندك كود راكب واضح وكود تشغيل منفصل ينفع لواجهة السواق أو الإدارة لاحقًا.
            </p>
          </div>
        </AppSurface>

        <div className="space-y-5">
          <PrettyQrCard value={shareUrl} />

          <AppSurface className="p-5">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">تصدير حديث للتذكرة</h3>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
              بدل الخلفية البيضاء البسيطة، التصدير الجديد بيطلع بتصميم مرتبط بطريقي والـ QR ورابط المتابعة جوه الملف نفسه.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <PrimaryButton
                onClick={() => handleExport('image')}
                disabled={Boolean(exporting)}
                icon={<Download className="h-5 w-5" />}
              >
                {exporting === 'image' ? 'جاري تجهيز الصورة…' : 'تنزيل صورة'}
              </PrimaryButton>
              <SecondaryButton
                onClick={() => handleExport('pdf')}
                disabled={Boolean(exporting)}
                icon={<FileText className="h-5 w-5" />}
              >
                {exporting === 'pdf' ? 'جاري تجهيز الـ PDF…' : 'تنزيل PDF'}
              </SecondaryButton>
            </div>
          </AppSurface>
        </div>
      </div>

      <StickyActionBar>
        <AppSurface className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">التذكرة والـ QR جاهزين للسفر والمشاركة</p>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">لو الرحلة قربت تبدأ، افتح متابعة الرحلة أو انسخ الرابط لأي حد محتاج يطمّن عليك.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[280px] sm:flex-row">
            <PrimaryButton onClick={onTrack} disabled={isPast || isCancelled} icon={<Map className="h-5 w-5" />} className="flex-1">
              متابعة الرحلة
            </PrimaryButton>
            <SecondaryButton
              onClick={async () => {
                const copied = await copyShareUrl(shareUrl);
                showToast(copied ? 'تم نسخ رابط متابعة الرحلة.' : 'تعذر نسخ الرابط تلقائيًا.', copied ? 'success' : 'error');
              }}
              icon={<Copy className="h-5 w-5" />}
              className="flex-1"
            >
              نسخ الرابط
            </SecondaryButton>
          </div>
        </AppSurface>
      </StickyActionBar>
    </div>
  );
}

export default TicketView;
