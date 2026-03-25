import React, { useState } from 'react';
import { Award, ShieldCheck } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { InlineNotice } from '../components/ui/StateBlocks';
import { MetaChip, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
import { createWalletTransaction } from '../../lib/wallet';
import {
  createClientMoneyId,
  isAuthoritativeRuntime,
  redeemPointsAtomic,
} from '../../lib/moneyLifecycle';

function PointsModal({
  closeModal,
  wallet: _wallet,
  setWallet,
  setTransactions,
  points,
  setPoints,
  showToast,
  runtimeMode = 'supabase',
  refreshCloudState,
}) {
  const [redeeming, setRedeeming] = useState(false);
  const authoritative = isAuthoritativeRuntime(runtimeMode);

  const handleRedeem = async () => {
    if (redeeming) return;

    if (points < 500) {
      showToast('محتاج 500 نقطة على الأقل عشان الاستبدال.', 'error');
      return;
    }

    setRedeeming(true);

    try {
      if (!authoritative) {
        setPoints((currentValue) => currentValue - 500);
        setWallet((currentValue) => currentValue + 50);
        setTransactions((currentValue) => [
          createWalletTransaction({
            id: `POINTS-${Date.now()}`,
            type: 'credit',
            amount: 50,
            description: 'استبدال 500 نقطة ولاء',
          }),
          ...currentValue,
        ]);

        showToast('تم استبدال 500 نقطة بـ 50 ج.م في المحفظة.', 'success');
        closeModal();
        return;
      }

      const result = await redeemPointsAtomic({
        pointsToSpend: 500,
        walletCredit: 50,
        clientId: createClientMoneyId('points'),
      });

      if (!result?.ok) {
        showToast(result?.message || 'تعذر استبدال النقاط حالياً.', 'error');
        return;
      }

      await refreshCloudState?.({ silent: true, force: true });
      showToast(result?.message || 'تم استبدال النقاط بنجاح.', 'success');
      closeModal();
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <ModalShell
      onClose={closeModal}
      title="نقاط الولاء"
      subtitle="كل رحلة منتهية بتضيف نقاط، وتقدر تحولها لرصيد في المحفظة لما توصل للحد المطلوب."
      icon={<Award className="h-6 w-6" />}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={closeModal}>رجوع</SecondaryButton>
          <PrimaryButton onClick={handleRedeem} disabled={points < 500 || redeeming}>
            {redeeming ? 'جاري الاستبدال…' : 'استبدل 500 نقطة'}
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-5">
        {authoritative ? (
          <InlineNotice
            tone="info"
            title="استبدال محمي على السيرفر"
            text="في وضع الإنتاج، الاستبدال لا يغيّر الرصيد محليًا. لازم ينجح RPC الذري على السيرفر الأول."
            icon={ShieldCheck}
          />
        ) : null}

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-sm font-black text-slate-500 dark:text-slate-400">رصيدك الحالي</p>
          <p className="mt-3 text-5xl font-black text-indigo-700 dark:text-indigo-300">{points}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <MetaChip label="كل 500 نقطة = 50 ج.م" tone="brand" />
            <MetaChip label={authoritative ? 'استبدال حقيقي' : 'تحويل للمحفظة'} tone="success" />
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-black text-slate-900 dark:text-white">إزاي تكسب النقاط؟</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
            بعد ما الرحلة تنتهي بنجاح، التطبيق بيضيف نقاط بناءً على قيمة الحجز بعد الخصومات. كل ما تسافر أكتر، رصيدك يزيد أسرع.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}

export default PointsModal;
