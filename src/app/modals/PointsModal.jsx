import React, { useState } from 'react';
import { Award, ShieldCheck } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { InlineNotice } from '../components/ui/StateBlocks';
import { MetaChip, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
import { formatCurrency, formatInteger } from '../utils/formatting';
import {
  createClientMoneyId,
  redeemPointsAtomic,
} from '../../lib/moneyLifecycle';

function PointsModal({
  closeModal,
  wallet: _wallet,
  setWallet: _setWallet,
  setTransactions: _setTransactions,
  points,
  setPoints: _setPoints,
  showToast,
  runtimeMode: _runtimeMode = 'supabase',
  refreshCloudState,
}) {
  const [redeeming, setRedeeming] = useState(false);

  const handleRedeem = async () => {
    if (redeeming) return;

    if (points < 500) {
      showToast(`محتاج ${formatInteger(500)} نقطة على الأقل عشان الاستبدال.`, 'error');
      return;
    }

    setRedeeming(true);

    try {
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
      subtitle={`كل ${formatInteger(500)} نقطة تقدر تتحول إلى ${formatCurrency(50)} في المحفظة.`}
      icon={<Award className="h-6 w-6" />}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={closeModal}>رجوع</SecondaryButton>
          <PrimaryButton onClick={handleRedeem} disabled={points < 500 || redeeming}>
            {redeeming ? 'جاري الاستبدال…' : `استبدل ${formatInteger(500)} نقطة`}
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-5">
        <InlineNotice
          tone="info"
          title="الاستبدال ينعكس بعد نجاح العملية"
          text="لو تمت العملية بنجاح، هتلاقي التحديث ظاهر في النقاط والمحفظة مباشرة."
          icon={ShieldCheck}
        />

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-sm font-black text-slate-500 dark:text-slate-400">رصيدك الحالي</p>
          <p className="mt-3 text-5xl font-black text-indigo-700 dark:text-indigo-300">{formatInteger(points)}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <MetaChip label={`كل ${formatInteger(500)} نقطة = ${formatCurrency(50)}`} tone="brand" />
            <MetaChip label="تحديث مباشر بعد النجاح" tone="success" />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default PointsModal;
