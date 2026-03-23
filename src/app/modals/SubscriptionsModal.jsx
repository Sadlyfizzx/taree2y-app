import React from 'react';
import { Crown } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { MetaChip, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
import { getLocalDateInputValue } from '../utils/travel';
import { formatCurrency } from '../utils/formatting';

function SubscriptionsModal({
  closeModal,
  wallet,
  setWallet,
  setTransactions,
  subscription,
  setSubscription,
  showToast,
}) {
  const handleBuy = (subType, price) => {
    if (wallet < price) {
      showToast('الرصيد الحالي مش مكفي لتفعيل الباقة.', 'error');
      return;
    }

    setWallet((currentValue) => currentValue - price);
    setTransactions((currentValue) => [
      {
        id: `SUB-${Date.now()}`,
        type: 'debit',
        amount: price,
        date: getLocalDateInputValue(),
        desc: `اشتراك باقة ${subType === 'student' ? 'الطالب' : 'VIP'}`,
      },
      ...currentValue,
    ]);
    setSubscription(subType);
    showToast('تم تفعيل الباقة بنجاح.', 'success');
    closeModal();
  };

  const plans = [
    {
      key: 'student',
      title: 'باقة الطالب',
      price: 100,
      tone: 'border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20',
      chips: ['خصم 15%', 'للرحلات المتكررة'],
      points: ['خصم ثابت على كل رحلة', 'مناسبة للتنقل الأسبوعي'],
    },
    {
      key: 'vip',
      title: 'باقة VIP',
      price: 300,
      tone: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
      chips: ['خصم 25%', 'أولوية أكبر'],
      points: ['خصم أعلى على كل الحجز', 'أنسب للمستخدم النشط جدًا'],
    },
  ];

  return (
    <ModalShell
      onClose={closeModal}
      title="باقات التوفير"
      subtitle="خطط بسيطة تقلل التكلفة على الرحلات المتكررة من غير ما تعقد تجربة الحجز."
      icon={<Crown className="h-6 w-6" />}
      maxWidth="max-w-3xl"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const isActive = subscription === plan.key;
          return (
            <div key={plan.key} className={`rounded-[28px] border p-5 ${plan.tone}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white">{plan.title}</h4>
                  <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{formatCurrency(plan.price)} / شهريًا</p>
                </div>
                {isActive ? <MetaChip label="مفعلة حالياً" tone="success" /> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {plan.chips.map((chip) => <MetaChip key={chip} label={chip} tone="brand" />)}
              </div>
              <ul className="mt-4 space-y-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                {plan.points.map((point) => (
                  <li key={point}>• {point}</li>
                ))}
              </ul>
              <div className="mt-5">
                {isActive ? (
                  <SecondaryButton className="w-full" onClick={closeModal}>تمام</SecondaryButton>
                ) : (
                  <PrimaryButton className="w-full" onClick={() => handleBuy(plan.key, plan.price)}>فعّل الباقة</PrimaryButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}

export default SubscriptionsModal;
