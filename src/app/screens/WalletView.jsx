import React, { useMemo } from 'react';
import { ArrowDown, ArrowUpRight, Plus, QrCode, Ticket, Wallet as WalletIcon } from 'lucide-react';
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

  const mobileSummary = [
    { label: 'إضافة', value: creditsCount, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' },
    { label: 'خصم', value: debitsCount, tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' },
    { label: 'الحركات', value: displayedTransactions.length, tone: 'bg-[var(--surface-soft)] text-[var(--ink)]' },
  ];

  return (
    <div className="space-y-4 pb-[calc(env(safe-area-inset-bottom)+108px)] md:space-y-5 md:pb-0">
      <PageHeading
        eyebrow="المحفظة"
        title="فلوسك وتركاتها في مكان واحد"
        subtitle="شحن، خصم، واسترداد بشكل أوضح على الموبايل من غير زحمة تفاصيل فوق بعض."
      />

      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] px-4 py-4 text-white shadow-[0_28px_56px_-34px_rgba(16,35,63,0.58)] sm:px-5 sm:py-5 md:rounded-[36px] md:p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at top left, rgba(255,255,255,0.28), transparent 26%), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: 'auto, 24px 24px, 24px 24px',
          }}
        />

        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black tracking-[0.18em] text-white/72">محفظة طريقي</p>
              <p className="mt-2 text-[2rem] font-black leading-none sm:text-4xl md:text-5xl">{formatCurrency(wallet)}</p>
              <p className="mt-2 max-w-[28rem] text-xs font-bold leading-6 text-white/82 sm:text-sm">
                الرصيد الجاهز للحجز، الشحن، والاسترداد — من غير كروت إضافية كبيرة على الموبايل.
              </p>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-white/14 text-white/92 sm:h-12 sm:w-12">
              <WalletIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
          </div>

          <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 sm:hidden">
            {mobileSummary.map((item) => (
              <div
                key={item.label}
                className={`min-w-[108px] rounded-[18px] px-3 py-2.5 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)] ${item.tone}`}
              >
                <p className="text-[11px] font-black tracking-[0.12em] opacity-75">{item.label}</p>
                <p className="mt-1 text-lg font-black">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <button
              type="button"
              onClick={openTopUp}
              className="interactive-press inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#dbe7ff] bg-[#f7fbff] px-4 py-3 text-sm font-black text-[#0f2342] shadow-[0_18px_38px_-22px_rgba(16,35,63,0.32)] transition hover:-translate-y-[1px] hover:border-white hover:bg-white"
            >
              <Plus className="h-4 w-4 text-[#163c98] sm:h-5 sm:w-5" />
              <span>شحن المحفظة</span>
            </button>

            <button
              type="button"
              onClick={openWalletQr}
              className="interactive-press inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/18 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-[1px] hover:bg-white/16"
            >
              <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>شحن بـ QR</span>
            </button>
          </div>
        </div>
      </section>

      <div className="hidden gap-4 sm:grid sm:grid-cols-3">
        <AppSurface className="p-5">
          <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">عمليات الإضافة</p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{creditsCount}</p>
        </AppSurface>
        <AppSurface className="p-5">
          <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">عمليات الخصم</p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{debitsCount}</p>
        </AppSurface>
        <AppSurface className="p-5">
          <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">إجمالي الحركات</p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{displayedTransactions.length}</p>
        </AppSurface>
      </div>

      <InlineNotice
        tone="info"
        title="معلومة مهمة"
        text="الشحن يضاف بعد تأكيد الدفع، وأي استرداد من إلغاء رحلة يظهر هنا تلقائيًا."
      />

      <AppSurface className="p-4 sm:p-5">
        <SectionHeader title="حركة المحفظة" subtitle="الأحدث أولًا، مع وصف واضح لكل عملية." />
        {displayedTransactions.length === 0 ? (
          <div className="mt-5">
            <EmptyStateCard
              title="مفيش حركات لسه"
              text="أول ما تشحن أو تحجز أو تسترد مبلغ، هتلاقي كل العمليات هنا بالتفصيل."
            />
          </div>
        ) : (
          <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
            {displayedTransactions.map((transaction) => {
              const isCredit = transaction.type === 'credit';
              const actionTone = isCredit
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300';

              return (
                <div
                  key={transaction.id}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 px-3.5 py-3 shadow-[0_14px_24px_-24px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950/60 sm:rounded-[24px] sm:px-4 sm:py-4"
                >
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[16px] ${actionTone} sm:h-12 sm:w-12 sm:rounded-[20px]`}>
                        {isCredit ? <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5" /> : <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />}
                      </span>

                      <div className="min-w-0">
                        <p className="text-sm font-black leading-6 text-slate-900 dark:text-white sm:text-[15px]">
                          {getWalletTransactionLabel(transaction)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:mt-2 sm:gap-2">
                          <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-black text-[var(--ink-muted)] sm:hidden">
                            {formatWalletTransactionDate(transaction)}
                          </span>
                          <div className="hidden sm:flex sm:flex-wrap sm:gap-2">
                            <MetaChip label={formatWalletTransactionDate(transaction)} tone="neutral" />
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${isCredit ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                            {isCredit ? 'إضافة' : 'خصم'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-left">
                      <p className={`text-[15px] font-black sm:text-base ${isCredit ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>
                        {isCredit ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </p>
                    </div>
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
