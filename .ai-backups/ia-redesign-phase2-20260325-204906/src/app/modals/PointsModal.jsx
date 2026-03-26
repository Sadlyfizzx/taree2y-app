import React, { useState } from 'react';
import { Award, ShieldCheck } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { InlineNotice } from '../components/ui/StateBlocks';
import { MetaChip, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
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
      showToast('محتاج 500 نقطة على الأقل عشان الاستبدال.', 'error');
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
      subtitle="كل رحلة منتهية بتضيف نقاط، والاستبدال دلوقتي يعتمد بالكامل على السيرفر من غير أي تعديل محلي."
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
        <InlineNotice
          tone="info"
          title="استبدال حقيقي فقط"
          text="تم إلغاء أي خصم أو إضافة محلية. لو السيرفر لم يؤكد العملية، الرصيد والنقاط لن يتغيروا."
          icon={ShieldCheck}
        />

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-sm font-black text-slate-500 dark:text-slate-400">رصيدك الحالي</p>
          <p className="mt-3 text-5xl font-black text-indigo-700 dark:text-indigo-300">{points}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <MetaChip label="كل 500 نقطة = 50 ج.م" tone="brand" />
            <MetaChip label="تأكيد من السيرفر" tone="success" />
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-black text-slate-900 dark:text-white">إيه اللي هيحصل؟</p>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                لما تضغط استبدال، التطبيق هيطلب العملية من السيرفر. بعد النجاح، بنعمل تحديث للحالة
                علشان النقاط والمحفظة ييجوا من المصدر الحقيقي.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default PointsModal;
