import { Check, Receipt, Ticket } from 'lucide-react';
import { GlassCard, KeyValueRow, ScreenHeader, SoftBadge } from '../components/ui/Taree2yUI';

function InvoiceView({ invoice, onContinue }) {
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-4">
      <GlassCard className="overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-600 p-6 text-white md:p-8">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <SoftBadge
              tone="emerald"
              text="تم الدفع بنجاح"
              className="border-white/20 bg-white/15 text-white"
            />
            <h2 className="mt-4 text-3xl font-black">حجزك اتأكد 🎉</h2>
            <p className="mt-2 text-sm font-bold text-emerald-50">
              جهّز شنطتك، الرحلة بقت عندك رسمي والتذكرة جاهزة بعد خطوة واحدة.
            </p>
          </div>

          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/18">
            <Check className="h-10 w-10" />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5 md:p-6">
        <ScreenHeader
          eyebrow="فاتورة الدفع"
          title="تفاصيل العملية"
          description="كل البنود اللي اتخصمت من المحفظة علشان الحجز."
          actions={<SoftBadge tone="indigo" text={invoice.pnr} />}
        />

        <div className="mt-6 rounded-[30px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
          <div className="mb-5 flex items-center gap-2 text-slate-900 dark:text-white">
            <Receipt className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-black">ملخص البنود</span>
          </div>

          <div className="space-y-3">
            {invoice.items.map((item, idx) => (
              <KeyValueRow
                key={idx}
                label={item.name}
                value={`${item.price} ج.م`}
                valueClassName={item.price < 0 ? 'text-emerald-600 dark:text-emerald-300' : ''}
              />
            ))}

            <div className="my-4 h-px bg-slate-200 dark:bg-slate-700" />

            <KeyValueRow
              label="الإجمالي"
              value={`${invoice.total} ج.م`}
              valueClassName="text-xl font-black text-indigo-600 dark:text-indigo-300"
            />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="text-[11px] font-black text-slate-400">طريقة الدفع</div>
              <div className="mt-2 text-sm font-black text-slate-900 dark:text-white">{invoice.method}</div>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="text-[11px] font-black text-slate-400">رقم العملية</div>
              <div className="mt-2 text-sm font-black text-slate-900 dark:text-white" dir="ltr">
                {invoice.pnr}
              </div>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="text-[11px] font-black text-slate-400">التاريخ</div>
              <div className="mt-2 text-sm font-black text-slate-900 dark:text-white" dir="ltr">
                {invoice.date}
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none sticky bottom-0 mt-6 bg-gradient-to-t from-white via-white to-transparent py-4 dark:from-slate-950 dark:via-slate-950">
          <button
            onClick={onContinue}
            className="pointer-events-auto mx-auto flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-indigo-500 to-violet-600 text-base font-black text-white shadow-[0_24px_54px_-28px_rgba(79,70,229,0.8)] transition active:scale-[0.99]"
          >
            عرض التذكرة
            <Ticket className="h-5 w-5" />
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

export default InvoiceView;
