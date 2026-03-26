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
        title="تم تأكيد الحجز"
        subtitle="الحجز اتسجل، والدفع تم، والتذكرة جاهزة دلوقتي. الخطوة الجاية إنك تفتحها وتراجع التفاصيل النهائية."
      />

      <AppSurface className="p-5">
        <BookingProgress current="confirmation" />
      </AppSurface>

      <section className="app-brand-panel rounded-[36px] p-6 text-white md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white/12 text-white">
              <Check className="h-7 w-7" />
            </span>
            <div>
              <h2 className="text-2xl font-black">الحجز اتأكد والدفع تم</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-white/80">
                رقم العملية والتفاصيل تحت، والتذكرة محفوظة كمان في قسم التذاكر.
              </p>
            </div>
          </div>
          <MetaChip label={`رقم العملية ${invoice.pnr}`} tone="brand" className="border-white/10 bg-white/10 text-white" />
        </div>
      </section>

      {preparedTicket?.from ? (
        <RouteTimeline trip={preparedTicket} className="p-0" />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <AppSurface className="p-5">
          <h3 className="flex items-center gap-2 text-lg font-black text-[var(--ink)]">
            <Receipt className="h-5 w-5 text-[var(--brand-strong)] dark:text-[var(--brand)]" />
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
            <div className="app-dashed-divider pt-3">
              <KeyValueRow
                label="الإجمالي المدفوع"
                value={formatCurrency(invoice.total)}
                valueClassName="text-lg font-black text-[var(--brand-strong)] dark:text-[var(--brand)]"
              />
            </div>
          </div>
        </AppSurface>

        <AppSurface className="p-5">
          <h3 className="text-lg font-black text-[var(--ink)]">إيه اللي بعد كده؟</h3>
          <div className="mt-4 space-y-3">
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-4">
              <p className="text-sm font-black text-[var(--ink)]">١) افتح التذكرة</p>
              <p className="mt-1 text-sm font-bold leading-6 text-[var(--ink-muted)]">
                هتلاقي فيها المحطة، المقاعد، رقم الحجز، والـ QR جاهزين للصعود.
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-4">
              <p className="text-sm font-black text-[var(--ink)]">٢) راجع المحطة والوقت</p>
              <p className="mt-1 text-sm font-bold leading-6 text-[var(--ink-muted)]">
                تأكد من اسم محطة التحرك والوصول قبل السفر، خصوصًا لو المدينة فيها أكتر من نقطة تجمع.
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-4">
              <p className="text-sm font-black text-[var(--ink)]">٣) افتح المتابعة وقت التحرك</p>
              <p className="mt-1 text-sm font-bold leading-6 text-[var(--ink-muted)]">
                لو الرحلة قربت تبدأ، التتبع هيوضح لك المرحلة الحالية من نفس التطبيق.
              </p>
            </div>
          </div>
        </AppSurface>
      </div>

      <StickyActionBar>
        <AppSurface className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-[var(--ink)]">التذكرة جاهزة دلوقتي</p>
            <p className="mt-1 text-sm font-bold text-[var(--ink-muted)]">
              افتحها وراجع كل التفاصيل قبل السفر.
            </p>
          </div>
          <PrimaryButton onClick={onContinue} icon={<Ticket className="h-5 w-5" />} className="w-full sm:w-auto sm:min-w-[240px]">
            افتح التذكرة
          </PrimaryButton>
        </AppSurface>
      </StickyActionBar>
    </div>
  );
}

export default InvoiceView;
