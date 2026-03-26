import React, { useState } from 'react';
import { Crown } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { MetaChip, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
import { formatCurrency } from '../utils/formatting';
import {
  createClientMoneyId,
  purchaseSubscriptionAtomic,
} from '../../lib/moneyLifecycle';

function SubscriptionsModal({
  closeModal,
  wallet,
  setWallet: _setWallet,
  setTransactions: _setTransactions,
  subscription,
  setSubscription: _setSubscription,
  showToast,
  runtimeMode: _runtimeMode = 'supabase',
  refreshCloudState,
}) {
  const [buyingPlan, setBuyingPlan] = useState('');

  const handleBuy = async (subType, price) => {
    if (buyingPlan) return;

    if (wallet < price) {
      showToast('الرصيد الحالي مش مكفي لتفعيل الباقة.', 'error');
      return;
    }

    setBuyingPlan(subType);

    try {
      const result = await purchaseSubscriptionAtomic({
        plan: subType,
        clientId: createClientMoneyId(`sub-${subType}`),
      });

      if (!result?.ok) {
        showToast(result?.message || 'تعذر تفعيل الباقة حالياً.', 'error');
        return;
      }

      await refreshCloudState?.({ silent: true, force: true });
      showToast(result?.message || 'تم تفعيل الباقة بنجاح.', 'success');
      closeModal();
    } finally {
      setBuyingPlan('');
    }
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
      chips: ['خصم 25%', 'أولوية أعلى'],
      points: ['خصم أعلى على كل الحجز', 'أنسب للمستخدم النشط جدًا'],
    },
  ];

  return (
    <ModalShell
      onClose={closeModal}
      title="باقات التوفير"
      subtitle="اختَر الباقة المناسبة وفعّلها من نفس المكان."
      icon={<Crown className="h-6 w-6" />}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const isActive = subscription === plan.key;
            const disabled = Boolean(buyingPlan) || isActive;

            return (
              <div
                key={plan.key}
                className={`rounded-[28px] border p-5 shadow-sm transition ${plan.tone} ${
                  isActive ? 'ring-2 ring-indigo-400/70 dark:ring-indigo-500/50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{plan.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {plan.points.join(' • ')}
                    </p>
                  </div>
                  <MetaChip label={formatCurrency(plan.price)} tone="brand" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {plan.chips.map((chip) => (
                    <MetaChip key={chip} label={chip} tone="success" />
                  ))}
                  {isActive ? <MetaChip label="مفعلة حاليًا" tone="warning" /> : null}
                </div>

                <div className="mt-6">
                  <PrimaryButton
                    className="w-full"
                    onClick={() => handleBuy(plan.key, plan.price)}
                    disabled={disabled}
                    loading={buyingPlan === plan.key}
                    loadingText="جاري التفعيل…"
                  >
                    {isActive ? 'مفعلة بالفعل' : `فعّل الآن بـ ${formatCurrency(plan.price)}`}
                  </PrimaryButton>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <SecondaryButton onClick={closeModal}>رجوع</SecondaryButton>
        </div>
      </div>
    </ModalShell>
  );
}

export default SubscriptionsModal;
