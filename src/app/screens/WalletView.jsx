import React, { useMemo } from 'react';
import {
  ArrowDown,
  CreditCard,
  Plus,
  QrCode,
  Send,
  Ticket,
} from 'lucide-react';
import {
  AppSurface,
  MetaChip,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
} from '../components/ui/AppPrimitives';
import { EmptyStateCard, InlineNotice } from '../components/ui/StateBlocks';
import { formatCurrency } from '../utils/formatting';
import {
  formatWalletTransactionDate,
  getWalletTransactionLabel,
  sortWalletTransactions,
} from '../../lib/wallet';

function WalletView({
  wallet,
  setWallet: _setWallet,
  transactions,
  setTransactions: _setTransactions,
  showToast,
  openTopUp,
  openWalletQr,
}) {
  const displayedTransactions = useMemo(
    () => sortWalletTransactions(transactions),
    [transactions],
  );

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="المحفظة"
        title="رصيدك وحركة الفلوس بشكل واضح"
        subtitle="كل خصم، شحن، أو استرداد بيتسجل هنا فورًا عشان تبقى عارف رصيدك رايح فين وجاي منين."
      />

      <section className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] p-6 text-white shadow-[0_30px_60px_-36px_rgba(16,35,63,0.6)]">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.28), transparent 26%), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: 'auto, 24px 24px, 24px 24px' }} />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-white/70">محفظة طريقي</p>
            <p className="mt-3 text-4xl font-black md:text-5xl">{formatCurrency(wallet)}</p>
            <p className="mt-2 text-sm font-bold text-white/80">الرصيد يتحدث تلقائيًا بعد كل حجز أو استرداد.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <PrimaryButton onClick={openTopUp} icon={<Plus className="h-5 w-5" />} className="!bg-white !text-indigo-700 hover:!bg-indigo-50 shadow-none">
              شحن المحفظة
            </PrimaryButton>
            <SecondaryButton onClick={openWalletQr} icon={<QrCode className="h-5 w-5" />} className="border-white/20 bg-white/10 text-white hover:bg-white/15 dark:border-white/20 dark:bg-white/10 dark:text-white">
              شحن بـ QR
            </SecondaryButton>
          </div>
        </div>
      </section>

      <InlineNotice
        tone="info"
        title="معلومة مهمة"
        text="أي استرداد ناتج عن إلغاء حجز هيظهر هنا تلقائيًا، وكمان في تاريخ الحركات تحت."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: CreditCard, label: 'بطاقة بنكية', hint: 'شحن مباشر للمحفظة', onClick: openTopUp },
          { icon: QrCode, label: 'QR الشحن', hint: 'افتح نافذة الكود والرابط لنفس الحساب', onClick: openWalletQr },
          { icon: Send, label: 'رابط سريع', hint: 'انسخ أو افتح رابط الشحن من أي جهاز', onClick: openWalletQr },
        ].map((method) => (
          <button
            key={method.label}
            type="button"
            onClick={method.onClick}
            className="rounded-[28px] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
          >
            <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
              <method.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">{method.label}</h3>
            <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{method.hint}</p>
          </button>
        ))}
      </div>

      <AppSurface className="p-5">
        <SectionHeader title="حركة المحفظة" subtitle="آخر العمليات على رصيدك بترتيب زمني من الأحدث للأقدم." />
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
                  <div className="flex items-start gap-3">
                    <span className={`grid h-12 w-12 place-items-center rounded-[20px] ${isCredit ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'}`}>
                      {isCredit ? <ArrowDown className="h-5 w-5" /> : <Ticket className="h-5 w-5" />}
                    </span>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{getWalletTransactionLabel(transaction)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <MetaChip label={formatWalletTransactionDate(transaction)} tone="neutral" />
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`text-base font-black ${isCredit ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>
                      {isCredit ? '+' : '-'} {formatCurrency(transaction.amount)}
                    </p>
                    <p className="mt-1 text-xs font-black text-slate-400 dark:text-slate-500">{isCredit ? 'إضافة' : 'خصم'}</p>
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

export default WalletView;
