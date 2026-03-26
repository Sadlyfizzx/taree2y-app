import React, { useMemo } from 'react';
import { ArrowDown, Plus, QrCode, Ticket } from 'lucide-react';
import {
  AppSurface,
  MetaChip,
  PageHeading,
  SectionHeader,
} from '../components/ui/AppPrimitives';
import { EmptyStateCard, InlineNotice } from '../components/ui/StateBlocks';
import { formatCurrency } from '../utils/formatting';
import {
  formatWalletTransactionDate,
  getWalletTransactionLabel,
  sortWalletTransactions,
} from '../../lib/wallet';

export default function WalletView({
  wallet,
  setWallet: _setWallet,
  transactions,
  setTransactions: _setTransactions,
  openTopUp,
  openWalletQr,
}) {
  const displayedTransactions = useMemo(() => sortWalletTransactions(transactions), [transactions]);

  const creditsCount = displayedTransactions.filter((entry) => entry.type === 'credit').length;
  const debitsCount = displayedTransactions.filter((entry) => entry.type !== 'credit').length;

  return (
    <div className="space-y-5 pb-[calc(env(safe-area-inset-bottom)+112px)] md:pb-0">
      <PageHeading
        eyebrow="المحفظة"
        title="الفلوس في مكان واحد وواضح"
        subtitle="شحن، خصم، واسترداد من غير لخبطة. كل حركة ليها وصف واضح وتوقيت ظاهر."
      />

      <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] p-5 text-white shadow-[0_30px_60px_-36px_rgba(16,35,63,0.6)] md:rounded-[36px] md:p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at top left, rgba(255,255,255,0.28), transparent 26%), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: 'auto, 24px 24px, 24px 24px',
          }}
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-white/70">محفظة طريقي</p>
            <p className="mt-3 text-4xl font-black md:text-5xl">{formatCurrency(wallet)}</p>
            <p className="mt-2 text-sm font-bold text-white/82">
              الرصيد الحالي المتاح للحجز أو لتفعيل الخدمات المدفوعة.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={openTopUp}
              className="interactive-press inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#dbe7ff] bg-[#f7fbff] px-5 py-3 text-sm font-black text-[#0f2342] shadow-[0_18px_38px_-22px_rgba(16,35,63,0.32)] transition hover:-translate-y-[1px] hover:border-white hover:bg-white"
            >
              <Plus className="h-5 w-5 text-[#163c98]" />
              <span>شحن المحفظة</span>
            </button>

            <button
              type="button"
              onClick={openWalletQr}
              className="interactive-press inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/18 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-[1px] hover:bg-white/16"
            >
              <QrCode className="h-5 w-5" />
              <span>شحن بـ QR</span>
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <AppSurface className="p-5">
          <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">
            عمليات الإضافة
          </p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{creditsCount}</p>
        </AppSurface>
        <AppSurface className="p-5">
          <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">
            عمليات الخصم
          </p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{debitsCount}</p>
        </AppSurface>
        <AppSurface className="p-5">
          <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">
            إجمالي الحركات
          </p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {displayedTransactions.length}
          </p>
        </AppSurface>
      </div>

      <InlineNotice
        tone="info"
        title="معلومة مهمة"
        text="الشحن يضاف بعد تأكيد الدفع، وأي استرداد من إلغاء رحلة يظهر هنا تلقائيًا."
      />

      <AppSurface className="p-5">
        <SectionHeader title="حركة المحفظة" subtitle="الأحدث أولًا، مع وصف واضح لكل عملية." />
        {displayedTransactions.length === 0 ? (
          <div className="mt-5">
            <EmptyStateCard
              title="مفيش حركات لسه"
              text="أول ما تشحن أو تحجز أو تسترد مبلغ، هتلاقي كل العمليات هنا بالتفصيل."
            />
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {displayedTransactions.map((transaction) => {
              const isCredit = transaction.type === 'credit';
              return (
                <div
                  key={transaction.id}
                  className="flex items-start justify-between gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-[20px] ${
                        isCredit
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                      }`}
                    >
                      {isCredit ? <ArrowDown className="h-5 w-5" /> : <Ticket className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {getWalletTransactionLabel(transaction)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <MetaChip label={formatWalletTransactionDate(transaction)} tone="neutral" />
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-left">
                    <p
                      className={`text-base font-black ${
                        isCredit ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isCredit ? '+' : '-'} {formatCurrency(transaction.amount)}
                    </p>
                    <p className="mt-1 text-xs font-black text-slate-400 dark:text-slate-500">
                      {isCredit ? 'إضافة' : 'خصم'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AppSurface>
    </div>
  );
}
