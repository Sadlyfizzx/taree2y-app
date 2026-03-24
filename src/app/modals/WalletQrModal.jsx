import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { MetaChip, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
import { formatCurrency } from '../utils/formatting';
import { buildWalletTopupUrl, copyTextWithFallback, createWalletRequestId } from '../public/publicPortal';

const QUICK_AMOUNTS = [50, 100, 200, 500];

export default function WalletQrModal({ closeModal, userId, showToast }) {
  const [amount, setAmount] = useState('100');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const numericAmount = Math.max(0, Number(amount) || 0);
  const requestId = useMemo(() => createWalletRequestId(), []);
  const payUrl = useMemo(
    () => buildWalletTopupUrl({ userId, amount: numericAmount, requestId }),
    [amount, numericAmount, requestId, userId],
  );

  useEffect(() => {
    let active = true;

    if (!numericAmount || !userId) {
      setQrDataUrl('');
      return undefined;
    }

    QRCode.toDataURL(payUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#163C98',
        light: '#F8FAFC',
      },
    })
      .then((nextUrl) => {
        if (active) setQrDataUrl(nextUrl);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [numericAmount, payUrl, userId]);

  const handleCopy = async () => {
    const copied = await copyTextWithFallback(payUrl);
    showToast(copied ? 'تم نسخ رابط الشحن.' : 'تعذر نسخ رابط الشحن حالياً.', copied ? 'success' : 'error');
  };

  return (
    <ModalShell
      onClose={closeModal}
      title="شحن المحفظة بـ QR"
      subtitle="حدد المبلغ، ثم افتح الرابط أو امسح الكود من أي جهاز لتأكيد الشحن لنفس الحساب."
      icon={<QrCode className="h-6 w-6" />}
      maxWidth="max-w-xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={closeModal}>إغلاق</SecondaryButton>
          <PrimaryButton onClick={handleCopy}>نسخ رابط الشحن</PrimaryButton>
        </div>
      }
    >
      <div className="space-y-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-black text-slate-900 dark:text-white">المبلغ</span>
          <input
            type="number"
            min="10"
            step="10"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-center text-xl font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((quickAmount) => (
            <button
              key={quickAmount}
              type="button"
              onClick={() => setAmount(String(quickAmount))}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:bg-slate-800"
            >
              {quickAmount} ج.م
            </button>
          ))}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
            <span>عملية</span>
            <span className="font-mono">{requestId}</span>
          </div>

          <div className="mx-auto mt-5 w-fit rounded-[32px] bg-white p-4 shadow-[0_20px_45px_-28px_rgba(16,35,63,0.35)] dark:bg-slate-900">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR شحن المحفظة" className="block h-[220px] w-[220px] rounded-[24px]" />
            ) : (
              <div className="grid h-[220px] w-[220px] place-items-center rounded-[24px] bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <QrCode className="h-12 w-12" />
              </div>
            )}
          </div>

          <p className="mt-4 text-2xl font-black text-indigo-700 dark:text-indigo-300">{formatCurrency(numericAmount)}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <MetaChip label="ينفتح من أي جهاز" tone="brand" />
            <MetaChip label="ينزل على نفس الحساب" tone="success" />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
