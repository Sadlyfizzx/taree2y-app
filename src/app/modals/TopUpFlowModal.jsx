import React, { useMemo, useState } from 'react';
import { CreditCard, ShieldCheck } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { MetaChip, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
import { InlineNotice } from '../components/ui/StateBlocks';
import { formatCurrency } from '../utils/formatting';
import { calculateWalletTopupBreakdown } from '../public/publicPortal';

function TopUpFlowModal({
  closeModal,
  userId,
  wallet: _wallet,
  setWallet: _setWallet,
  setTransactions: _setTransactions,
  showToast,
  runtimeMode: _runtimeMode = 'supabase',
  openWalletQr,
}) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const numericAmount = Math.max(0, Number(amount) || 0);
  const { grossAmount, feeAmount, netAmount } = useMemo(
    () => calculateWalletTopupBreakdown(numericAmount),
    [numericAmount],
  );

  const handleConfirm = () => {
    if (loading) return;

    if (!grossAmount || grossAmount < 50) {
      showToast('أقل شحن 50 ج.م.', 'error');
      return;
    }

    if (!userId) {
      showToast('لازم تسجل دخول الأول قبل الشحن.', 'error');
      return;
    }

    setLoading(true);
    closeModal();
    openWalletQr?.(grossAmount);
    showToast('اتفتح رابط الشحن. بعد التأكيد هيتضاف صافي المبلغ لنفس الحساب.', 'success');
  };

  return (
    <ModalShell
      onClose={closeModal}
      title="شحن المحفظة"
      subtitle="اختَر المبلغ، وبعدها كمّل التأكيد من صفحة الشحن العامة المرتبطة بنفس الحساب."
      icon={<CreditCard className="h-6 w-6" />}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={closeModal}>إلغاء</SecondaryButton>
          <PrimaryButton onClick={handleConfirm} loading={loading} loadingText="جاري المتابعة…">
            افتح صفحة الشحن
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-5">
        <InlineNotice
          tone="info"
          title="المسار المتاح حالياً"
          text="الشحن الحالي بيتأكد من صفحة الـ QR العامة، وبعد نجاح التأكيد بيتسجل الرصيد لنفس الحساب بشكل مباشر ومن غير تكرار."
          icon={ShieldCheck}
        />

        <label className="flex flex-col gap-2">
          <span className="text-sm font-black text-slate-900 dark:text-white">المبلغ المدفوع</span>
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

        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/60">
          <p className="text-sm font-black text-slate-900 dark:text-white">ملخص الشحن</p>
          <div className="mt-3 space-y-2 text-sm font-black">
            <div className="flex items-center justify-between gap-3 text-slate-700 dark:text-slate-200">
              <span>المبلغ المدفوع</span>
              <span>{formatCurrency(grossAmount)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-amber-700 dark:text-amber-300">
              <span>رسوم التشغيل</span>
              <span>- {formatCurrency(feeAmount)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 text-emerald-700 dark:border-slate-700 dark:text-emerald-300">
              <span>الصافي المتوقع إضافته</span>
              <span>{formatCurrency(netAmount)}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <MetaChip label="المسار الفعلي: QR" tone="brand" />
            <MetaChip label="من غير تكرار عند إعادة التأكيد" tone="success" />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default TopUpFlowModal;
