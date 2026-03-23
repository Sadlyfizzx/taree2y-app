import React from 'react';
import { Check, Receipt, Ticket } from 'lucide-react';
import BookingProgress from '../components/ui/BookingProgress';
import RouteTimeline from '../components/ui/RouteTimeline';
import {
  AppSurface,
  KeyValueRow,
  MetaChip,
  PageHeading,
  PrimaryButton,
  StickyActionBar,
} from '../components/ui/AppPrimitives';
import { formatCurrency } from '../utils/formatting';
import { withStationNames } from '../utils/stations';

function InvoiceView({ invoice, ticket, onContinue }) {
  const preparedTicket = withStationNames(ticket);

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="الخطوة ٤ من ٤"
        title="تم تأكيد الحجز بنجاح"
        subtitle="كل حاجة اتسجلت، والتذكرة جاهزة دلوقتي. الخطوة الجاية إنك تفتحها وتراجع التفاصيل النهائية."
      />

      <AppSurface className="p-5">
        <BookingProgress current="confirmation" />
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <Check className="h-7 w-7" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">الحجز اتأكد والدفع تم</h2>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">رقم العملية والتفاصيل تحت، والتذكرة محفوظة كمان في "رحلاتي".</p>
            </div>
          </div>
          <MetaChip label={`رقم العملية ${invoice.pnr}`} tone="brand" />
        </div>
      </AppSurface>

      {preparedTicket?.from ? (
        <RouteTimeline trip={preparedTicket} className="p-0" />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <AppSurface className="p-5">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <Receipt className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
            تفاصيل الفاتورة
          </h3>
          <div className="mt-4 space-y-3">
            {invoice.items.map((item, index) => (
              <KeyValueRow
                key={`${item.name}-${index}`}
                label={item.name}
                value={`${item.price < 0 ? '-' : ''}${formatCurrency(Math.abs(item.price))}`}
                valueClassName={item.price < 0 ? 'text-emerald-700 dark:text-emerald-300' : ''}
              />
            ))}
            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <KeyValueRow
                label="الإجمالي المدفوع"
                value={formatCurrency(invoice.total)}
                valueClassName="text-lg font-black text-indigo-700 dark:text-indigo-300"
              />
            </div>
          </div>
        </AppSurface>

        <AppSurface className="p-5">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">إيه اللي بعد كده؟</h3>
          <div className="mt-4 space-y-3">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-sm font-black text-slate-900 dark:text-white">١) افتح التذكرة</p>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">هتلاقي رقم الحجز، المقاعد، وبيانات الصعود في شاشة واحدة.</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-sm font-black text-slate-900 dark:text-white">٢) تابع الرحلة وقت التحرك</p>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">من التذكرة تقدر تفتح التتبع وتشوف حالة الرحلة ومكانها التقريبي.</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-sm font-black text-slate-900 dark:text-white">٣) المحفظة اتحدثت</p>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">السجل بيتحدث تلقائيًا وهتشوف الدفع وأي استرداد بعد كده في المحفظة.</p>
            </div>
          </div>
        </AppSurface>
      </div>

      <StickyActionBar>
        <AppSurface className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">التذكرة جاهزة دلوقتي</p>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">تقدر تفتحها أو ترجع لها لاحقًا من تبويب رحلاتي.</p>
          </div>
          <PrimaryButton onClick={onContinue} icon={<Ticket className="h-5 w-5" />}>
            افتح التذكرة
          </PrimaryButton>
        </AppSurface>
      </StickyActionBar>
    </div>
  );
}

export default InvoiceView;
