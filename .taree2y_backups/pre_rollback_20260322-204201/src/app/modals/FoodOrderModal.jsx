import { Coffee } from 'lucide-react';
import { ModalShell } from '../components/ui/Taree2yUI';
import { getLocalDateInputValue } from '../utils/travel';

function FoodOrderModal({ closeModal, wallet, setWallet, setTransactions, showToast }) {
  const handleOrder = (price, item) => {
    if (wallet < price) return showToast('رصيدك مش مكفي، اشحن من المحفظة الأول', 'error');
    setWallet((prev) => prev - price);
    setTransactions((prev) => [
      {
        id: `TXN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        type: 'debit',
        amount: price,
        date: getLocalDateInputValue(),
        desc: `طلب ${item} في الريست`,
      },
      ...prev,
    ]);
    showToast('طلبك اتسجل! هيستناك سخن لما الباص يقف في الريست ☕', 'success');
    closeModal();
  };

  const items = [
    { name: 'قهوة تركي مظبوط', p: 30 },
    { name: 'باتيه جبنة طازة', p: 25 },
    { name: 'وجبة مكس جريل خفيفة', p: 95 },
  ];

  return (
    <ModalShell
      tone="amber"
      title="اطلب للريست"
      subtitle="احجز طلبك من دلوقتي، واستلمه أول ما الباص يقف من غير انتظار."
      icon={<Coffee />}
      closeModal={closeModal}
      maxWidth="max-w-[460px]"
    >
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
          >
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-white">{item.name}</div>
              <div className="mt-1 text-sm font-black text-indigo-600 dark:text-indigo-300" dir="ltr">
                {item.p} ج.م
              </div>
            </div>
            <button
              onClick={() => handleOrder(item.p, item.name)}
              className="rounded-[18px] bg-indigo-500 px-4 py-3 text-sm font-black text-white transition hover:opacity-95"
            >
              اطلب
            </button>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

export default FoodOrderModal;
