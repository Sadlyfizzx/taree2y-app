import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { ModalShell, SoftBadge } from '../components/ui/Taree2yUI';
import { getLocalDateInputValue } from '../utils/travel';

function TopUpFlowModal({ closeModal, wallet, setWallet, setTransactions, showToast }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    const val = parseInt(amount, 10);
    if (!val || val < 50) return showToast('أقل شحن 50 ج.م', 'error');

    setLoading(true);

    setTimeout(() => {
      setWallet((prev) => prev + val);
      setTransactions((prev) => [
        {
          id: `DEMO-TOPUP-${Date.now()}`,
          type: 'credit',
          amount: val,
          date: getLocalDateInputValue(),
          desc: 'شحن رصيد تجريبي',
        },
        ...prev,
      ]);
      setLoading(false);
      showToast(`تمت إضافة ${val} ج.م رصيد تجريبي`, 'success');
      closeModal();
    }, 600);
  };

  return (
    <ModalShell
      tone="indigo"
      title="شحن المحفظة"
      subtitle="دي محفظة تجريبية وليست وسيلة دفع حقيقية. استخدمها لتجربة تدفق الحجز فقط."
      icon={<CreditCard />}
      closeModal={closeModal}
      maxWidth="max-w-[460px]"
    >
      <div className="space-y-5">
        <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            الرصيد الحالي
          </div>
          <div className="mt-2 text-4xl font-black text-slate-900 dark:text-white" dir="ltr">
            {wallet} ج.م
          </div>
        </div>

        <input
          type="number"
          placeholder="المبلغ المراد إضافته"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-16 w-full rounded-[24px] border border-slate-200 bg-white px-4 text-center text-2xl font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />

        <div className="grid grid-cols-3 gap-2" dir="ltr">
          {[100, 200, 500].map((value) => (
            <button
              key={value}
              onClick={() => setAmount(String(value))}
              className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-black text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500/20 dark:hover:text-indigo-300"
            >
              +{value}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <SoftBadge tone="emerald" text="شحن فوري" />
          <SoftBadge tone="amber" text="تجريبي" />
        </div>

        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex h-14 w-full items-center justify-center rounded-[24px] bg-gradient-to-r from-indigo-500 to-violet-600 text-base font-black text-white shadow-[0_24px_54px_-28px_rgba(79,70,229,0.8)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'جاري الإضافة...' : 'إضافة رصيد تجريبي'}
        </button>
      </div>
    </ModalShell>
  );
}

export default TopUpFlowModal;
