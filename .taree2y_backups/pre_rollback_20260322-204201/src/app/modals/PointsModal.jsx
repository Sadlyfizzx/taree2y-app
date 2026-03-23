import { Award } from 'lucide-react';
import { ModalShell, SoftBadge } from '../components/ui/Taree2yUI';
import { getLocalDateInputValue } from '../utils/travel';

function PointsModal({ closeModal, wallet, setWallet, setTransactions, points, setPoints, showToast }) {
  const handleRedeem = () => {
    if (points < 500) return showToast('محتاج 500 نقطة على الأقل عشان تبدلهم بفلوس', 'error');
    const pointsToRedeem = 500;
    const moneyGained = 50;

    setPoints((prev) => prev - pointsToRedeem);
    setWallet((prev) => prev + moneyGained);
    setTransactions((prev) => [
      {
        id: `TXN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        type: 'credit',
        amount: moneyGained,
        date: getLocalDateInputValue(),
        desc: 'استبدال 500 نقطة ولاء',
      },
      ...prev,
    ]);

    showToast(`عاش! بدلت 500 نقطة بـ ${moneyGained} ج.م في محفظتك 💸`, 'success');
    closeModal();
  };

  return (
    <ModalShell
      tone="indigo"
      title="نقاط ولاء طريقي"
      subtitle="كل 500 نقطة تقدر تبدلهم بـ 50 ج.م داخل المحفظة."
      icon={<Award />}
      closeModal={closeModal}
      maxWidth="max-w-[430px]"
    >
      <div className="space-y-5 text-center">
        <div className="rounded-[28px] border border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-500/20 dark:bg-indigo-500/10">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-500 dark:text-indigo-300">
            الرصيد الحالي
          </div>
          <div className="mt-2 text-5xl font-black text-indigo-600 dark:text-indigo-300" dir="ltr">
            {points}
          </div>
          <div className="mt-2 text-sm font-black text-indigo-600/80 dark:text-indigo-300/80">
            Points
          </div>
        </div>

        <div className="flex justify-center gap-2">
          <SoftBadge tone="emerald" text="تحويل للنقد" />
          <SoftBadge tone="amber" text="500 نقطة = 50 ج.م" />
        </div>

        <button
          onClick={handleRedeem}
          disabled={points < 500}
          className={`flex h-14 w-full items-center justify-center rounded-[24px] text-base font-black transition ${
            points >= 500
              ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_24px_54px_-28px_rgba(79,70,229,0.8)] active:scale-[0.99]'
              : 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
          }`}
        >
          استبدل 500 نقطة بـ 50 ج.م
        </button>
      </div>
    </ModalShell>
  );
}

export default PointsModal;
