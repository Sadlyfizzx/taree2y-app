import React from 'react';
import {
  Download,
  Map,
  QrCode,
  Ticket,
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

function TicketView({ ticket, user, onTrack, showToast }) {
  if (!ticket) return null;

  const data = withStationNames(ticket);
  const isPast = data.status === 'past';
  const isCancelled = data.status === 'cancelled';
  const isRefundPending = data.status === 'refund_pending';

  const downloadTicket = () => {
    showToast('اتحفظت نسخة تجريبية من التذكرة.', 'success');
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

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <AppSurface className="ticket-shell overflow-hidden p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">رقم الحجز</p>
              <p className="mt-1 font-mono text-2xl font-black text-slate-900 dark:text-white">{data.pnr || data.id}</p>
            </div>
            <MetaChip label={`التاريخ ${data.date}`} tone="brand" />
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
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-[28px] border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
              <QrCode className="h-24 w-24 text-slate-900 dark:text-white" />
            </div>
            <p className="mt-4 text-sm font-black text-slate-900 dark:text-white">{data.ticketToken || 'رمز تجريبي للتذكرة'}</p>
            <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">لو الشبكة ضعفت، رقم الحجز يفضل ظاهر معاك في أعلى الشاشة.</p>
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
        <AppSurface className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">لو الرحلة قربت تتحرك افتح التتبع</p>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">هتشوف حالة الرحلة والمستجدات من نفس التطبيق.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[280px] sm:flex-row">
            <PrimaryButton onClick={onTrack} disabled={isPast || isCancelled} icon={<Map className="h-5 w-5" />} className="flex-1">
              متابعة الرحلة
            </PrimaryButton>
            <SecondaryButton onClick={downloadTicket} icon={<Download className="h-5 w-5" />} className="flex-1">
              حفظ نسخة
            </SecondaryButton>
          </div>
        </AppSurface>
      </StickyActionBar>
    </div>
  );
}

export default TicketView;
