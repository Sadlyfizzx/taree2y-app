import React, { useState } from 'react';
import { CreditCard, Phone, Send } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { MetaChip, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
import { getLocalDateInputValue } from '../utils/travel';
import { formatCurrency } from '../utils/formatting';

const METHODS = [
  { key: 'card', label: 'بطاقة بنكية', icon: <CreditCard className="h-5 w-5" /> },
  { key: 'wallet', label: 'فودافون كاش', icon: <Phone className="h-5 w-5" /> },
  { key: 'instapay', label: 'إنستاباي', icon: <Send className="h-5 w-5" /> },
];

function TopUpFlowModal({ closeModal, wallet: _wallet, setWallet, setTransactions, showToast }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('card');
  const [loading, setLoading] = useState(false);

  const numericAmount = Math.max(0, Number(amount) || 0);

  const handleConfirm = () => {
    if (!numericAmount || numericAmount < 50) {
      showToast('أقل شحن 50 ج.م.', 'error');
      return;
    }

    setLoading(true);

    window.setTimeout(() => {
      setWallet((currentValue) => currentValue + numericAmount);
      setTransactions((currentValue) => [
        {
          id: `DEMO-TOPUP-${Date.now()}`,
          type: 'credit',
          amount: numericAmount,
          date: getLocalDateInputValue(),
          desc: `شحن رصيد (${METHODS.find((item) => item.key === method)?.label || 'محفظة'})`,
        },
        ...currentValue,
      ]);
      setLoading(false);
      showToast(`تم شحن ${numericAmount} ج.م في المحفظة.`, 'success');
      closeModal();
    }, 700);
  };

  return (
    <ModalShell
      onClose={closeModal}
      title="شحن المحفظة"
      subtitle="عملية شحن تجريبية عشان تراجع الواجهة وتكمل تجربة الحجز."
      icon={<CreditCard className="h-6 w-6" />}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={closeModal}>إلغاء</SecondaryButton>
          <PrimaryButton onClick={handleConfirm} disabled={loading}>
            {loading ? 'جاري الإضافة…' : 'أكد الشحن'}
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-black text-slate-900 dark:text-white">المبلغ</span>
          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="اكتب مبلغ الشحن"
            className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-center text-xl font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {[100, 200, 500, 1000].map((quickAmount) => (
            <button
              key={quickAmount}
              type="button"
              onClick={() => setAmount(String(quickAmount))}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:bg-slate-800"
            >
              + {quickAmount}
            </button>
          ))}
        </div>

        <div>
          <p className="text-sm font-black text-slate-900 dark:text-white">طريقة الشحن</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {METHODS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setMethod(item.key)}
                className={`rounded-[24px] border px-4 py-4 text-right transition ${
                  method === item.key
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300'
                    : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-black">{item.icon}{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/60">
          <p className="text-sm font-black text-slate-900 dark:text-white">المبلغ اللي هيتضاف</p>
          <p className="mt-2 text-2xl font-black text-indigo-700 dark:text-indigo-300">{formatCurrency(numericAmount)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <MetaChip label="شحن تجريبي" tone="brand" />
            <MetaChip label="بدون دفع حقيقي" tone="warning" />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default TopUpFlowModal;
