import { ArrowDown, CreditCard, Phone, Plus, QrCode, Send, ShieldCheck, Ticket } from 'lucide-react';
import { EmptyState, GlassCard, ScreenHeader, SoftBadge } from '../components/ui/Taree2yUI';

function WalletView({ wallet, setWallet, transactions, setTransactions, showToast, openTopUp }) {
  return (
    <div className="space-y-5 pb-4">
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard className="overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-6 text-white md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SoftBadge
                tone="indigo"
                text="المحفظة التجريبية"
                className="border-white/15 bg-white/10 text-white"
              />
              <div className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-indigo-100">
                Demo Wallet
              </div>
              <div className="mt-2 text-5xl font-black tracking-tight" dir="ltr">
                {wallet.toLocaleString()} EGP
              </div>
              <div className="mt-3 text-sm font-bold text-indigo-100">
                الرصيد متزامن مع حسابك من خلال Supabase في النسخة الحالية.
              </div>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white/12">
              <ShieldCheck className="h-7 w-7 text-indigo-100" />
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={openTopUp}
              className="rounded-[22px] bg-white/12 px-5 py-4 text-sm font-black text-white transition hover:bg-white/18"
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                شحن تجريبي
              </span>
            </button>
            <button
              onClick={() => showToast('الدفع بالـ QR غير متاح في النسخة التجريبية', 'error')}
              className="rounded-[22px] bg-white/12 px-5 py-4 text-sm font-black text-white transition hover:bg-white/18"
            >
              <span className="inline-flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR
              </span>
            </button>
          </div>
        </GlassCard>

        <GlassCard className="p-5 md:p-6">
          <ScreenHeader
            eyebrow="طرق الشحن"
            title="اختار وسيلة الشحن"
            description="كل الخيارات دي بتفتح نفس الشحن التجريبي حالياً لحد ما الربط النهائي يكتمل."
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { icon: CreditCard, label: 'فيزا' },
              { icon: Phone, label: 'فودافون كاش' },
              { icon: Send, label: 'إنستاباي' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={openTopUp}
                className="rounded-[26px] border border-slate-200 bg-white p-5 text-center transition hover:-translate-y-0.5 hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-indigo-500/20"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="mt-4 text-sm font-black text-slate-900 dark:text-white">
                  {item.label}
                </div>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5 md:p-6">
        <ScreenHeader
          eyebrow="سجل المحفظة"
          title="تحركات الرصيد"
          description="كل خصم أو إضافة على المحفظة بيظهر هنا بالتاريخ والوصف."
        />

        {transactions.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={<Ticket />}
              title="مفيش عمليات لسه"
              description="أول ما تشحن أو تحجز رحلة هتلاقي كل التحركات هنا."
              className="max-w-full"
            />
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="flex flex-col gap-3 rounded-[26px] border border-slate-200 bg-white p-4 transition dark:border-slate-700 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${
                      txn.type === 'credit'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {txn.type === 'credit' ? (
                      <ArrowDown className="h-5 w-5" />
                    ) : (
                      <Ticket className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">{txn.desc}</div>
                    <div className="mt-1 text-[11px] font-black text-slate-400" dir="ltr">
                      {txn.date}
                    </div>
                  </div>
                </div>

                <div
                  className={`text-lg font-black ${
                    txn.type === 'credit'
                      ? 'text-emerald-600 dark:text-emerald-300'
                      : 'text-slate-900 dark:text-white'
                  }`}
                  dir="ltr"
                >
                  {txn.type === 'credit' ? '+' : '-'}
                  {txn.amount} ج.م
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export default WalletView;
