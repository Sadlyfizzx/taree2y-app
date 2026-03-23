import React from 'react';
import { useState } from 'react';
import { X } from 'lucide-react';
import { getLocalDateInputValue } from '../utils/travel';

function TopUpFlowModal({ closeModal, wallet: _wallet, setWallet, setTransactions, showToast }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    const val = parseInt(amount, 10);
    if (!val || val < 50) return showToast('أقل شحن 50 ج.م', 'error');

    setLoading(true);

    setTimeout(() => {
      setWallet((p) => p + val);
      setTransactions((p) => [
        {
          id: `DEMO-TOPUP-${Date.now()}`,
          type: 'credit',
          amount: val,
          date: getLocalDateInputValue(),
          desc: 'شحن رصيد تجريبي',
        },
        ...p,
      ]);
      setLoading(false);
      showToast(`تمت إضافة ${val} ج.م رصيد تجريبي`, 'success');
      closeModal();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-down">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[428px] rounded-[2rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto hide-scrollbar">
        <button onClick={closeModal} className="absolute top-6 left-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white">
           <X className="w-5 h-5"/>
        </button>

        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 pt-2">شحن المحفظة</h3>
        <p className="text-sm font-bold text-slate-500 mb-6">دي محفظة تجريبية وليست وسيلة دفع حقيقية.</p>

        <div className="space-y-5">
          <input
            type="number"
            placeholder="المبلغ المراد إضافته"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-4 text-xl font-black text-center text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition"
          />

          <div className="flex gap-2 mb-2" dir="ltr">
            {[100, 200, 500].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 hover:border-indigo-300 transition-colors text-lg"
              >
                +{v}
              </button>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-black text-lg py-4 rounded-2xl mt-4 active:scale-95 transition-transform shadow-lg shadow-indigo-600/30 flex justify-center items-center gap-2"
          >
            {loading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : 'إضافة رصيد تجريبي'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TopUpFlowModal;
