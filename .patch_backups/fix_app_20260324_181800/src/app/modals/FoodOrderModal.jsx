import React from 'react';
import { Coffee } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { PrimaryButton } from '../components/ui/AppPrimitives';
import { getLocalDateInputValue } from '../utils/travel';
import { formatCurrency } from '../utils/formatting';

const MENU_ITEMS = [
  { name: 'قهوة تركي مظبوط', price: 30 },
  { name: 'باتيه جبنة طازة', price: 25 },
  { name: 'وجبة خفيفة ميني', price: 95 },
];

function FoodOrderModal({ closeModal, wallet, setWallet, setTransactions, showToast }) {
  const handleOrder = (price, item) => {
    if (wallet < price) {
      showToast('الرصيد مش كافي للطلب. اشحن من المحفظة الأول.', 'error');
      return;
    }

    setWallet((currentValue) => currentValue - price);
    setTransactions((currentValue) => [
      {
        id: `FOOD-${Date.now()}`,
        type: 'debit',
        amount: price,
        date: getLocalDateInputValue(),
        desc: `طلب ${item} وقت الاستراحة`,
      },
      ...currentValue,
    ]);
    showToast('طلبك اتسجل وهيكون جاهز وقت الوقفة.', 'success');
    closeModal();
  };

  return (
    <ModalShell
      onClose={closeModal}
      title="اطلب قبل الاستراحة"
      subtitle="اختر طلبك قبل الوقفة عشان تستلمه أسرع من غير زحمة."
      icon={<Coffee className="h-6 w-6" />}
      maxWidth="max-w-lg"
    >
      <div className="space-y-3">
        {MENU_ITEMS.map((item) => (
          <div key={item.name} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{item.name}</p>
                <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">هيوصلك في نقطة الاستراحة مباشرة.</p>
              </div>
              <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">{formatCurrency(item.price)}</p>
            </div>
            <PrimaryButton className="mt-4 w-full" onClick={() => handleOrder(item.price, item.name)}>
              اطلب دلوقتي
            </PrimaryButton>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

export default FoodOrderModal;
