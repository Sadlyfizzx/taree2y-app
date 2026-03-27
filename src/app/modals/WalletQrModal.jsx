import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { ExternalLink, QrCode, ShieldCheck } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { InlineNotice } from '../components/ui/StateBlocks';
import { MetaChip, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
import { formatCurrency } from '../utils/formatting';
import {
  copyTextWithFallback,
  issueWalletTopupRequest,
} from '../public/publicPortal';

const QUICK_AMOUNTS = [50, 100, 200, 500];

export default function WalletQrModal({ closeModal, userId, showToast, initialAmount = 100 }) {
  const [amount, setAmount] = useState(() => String(initialAmount || 100));
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [requestData, setRequestData] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState('');

  useEffect(() => {
    if (initialAmount) {
      setAmount(String(initialAmount));
    }
  }, [initialAmount]);

  const numericAmount = Math.max(0, Number(amount) || 0);
  const grossAmount = Number(requestData?.grossAmount ?? numericAmount ?? 0);
  const feeAmount = Number(requestData?.feeAmount ?? 0);
  const netAmount = Number(requestData?.creditAmount ?? 0);
  const canIssueRequest = Boolean(userId && numericAmount >= 50);
  const payUrl = requestData?.url || '';
  const requestId = requestData?.requestId || '';

  useEffect(() => {
    setRequestData(null);
    setIssueError('');
    setQrDataUrl('');
  }, [numericAmount, userId]);

  const ensureRequest = useCallback(async () => {
    if (!canIssueRequest) {
      showToast('أقل شحن 50 ج.م ولازم يكون فيه حساب مرتبط بالرابط.', 'error');
      return null;
    }

    if (requestData?.requestId && requestData.grossAmount === numericAmount) {
      return requestData;
    }

    setIssuing(true);
    setIssueError('');

    try {
      const issued = await issueWalletTopupRequest({
        userId,
        amount: numericAmount,
        paymentChannel: 'public_qr',
      });

      if (!issued?.requestId || !issued?.url) {
        throw new Error('wallet_topup_request_issue_failed');
      }

      setRequestData(issued);
      return issued;
    } catch (error) {
      const payload = JSON.stringify({
        message: error?.message || '',
        details: error?.details || '',
        hint: error?.hint || '',
        code: error?.code || '',
      }).toLowerCase();

      const nextMessage = payload.includes('issue_public_wallet_topup_request')
        ? 'ميزة شحن المحفظة الآمنة محتاجة SQL pass 3 على Supabase قبل ما تولّد QR جديد.'
        : 'تعذر تجهيز طلب الشحن حالياً. جرّب تاني بعد شوية.';

      setIssueError(nextMessage);
      showToast(nextMessage, 'error');
      return null;
    } finally {
      setIssuing(false);
    }
  }, [canIssueRequest, numericAmount, requestData, showToast, userId]);

  useEffect(() => {
    let active = true;

    if (!canIssueRequest) {
      setQrDataUrl('');
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      const issued = await ensureRequest();
      if (!active || !issued?.url) return;

      try {
        const nextUrl = await QRCode.toDataURL(issued.url, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 320,
          color: {
            dark: '#163C98',
            light: '#F8FAFC',
          },
        });
        if (active) setQrDataUrl(nextUrl);
      } catch {
        if (active) setQrDataUrl('');
      }
    }, 260);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [canIssueRequest, ensureRequest]);

  const handleCopy = async () => {
    const issued = await ensureRequest();
    if (!issued?.url) return;
    const copied = await copyTextWithFallback(issued.url, 'رابط الشحن');
    showToast(copied ? 'تم نسخ رابط الشحن.' : 'تعذر نسخ الرابط حالياً.', copied ? 'success' : 'error');
  };

  const handleOpen = async () => {
    const issued = await ensureRequest();
    if (!issued?.url) return;
    window.open(issued.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <ModalShell
      onClose={closeModal}
      title="شحن المحفظة بـ QR"
      subtitle="حدّد المبلغ، ثم افتح الرابط أو امسح الكود لإكمال الدفع."
      icon={<QrCode className="h-6 w-6" />}
      maxWidth="max-w-xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={closeModal}>إغلاق</SecondaryButton>
          <SecondaryButton onClick={handleCopy} disabled={!canIssueRequest || issuing}>نسخ الرابط</SecondaryButton>
          <PrimaryButton
            onClick={handleOpen}
            icon={<ExternalLink className="h-4 w-4" />}
            disabled={!canIssueRequest || issuing}
            loading={issuing}
            loadingText="جاري تجهيز الطلب…"
          >
            افتح صفحة الدفع
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-5">
        <InlineNotice
          tone={canIssueRequest && !issueError ? 'info' : 'warning'}
          title={canIssueRequest && !issueError ? 'متى يظهر الرصيد؟' : 'راجع مبلغ الشحن أو إعداد السيرفر'}
          text={
            canIssueRequest
              ? issueError || 'بعد تأكيد الدفع بنجاح، الرصيد هيتحدث تلقائيًا على نفس الحساب.'
              : 'أقل شحن 50 ج.م. عدّل المبلغ قبل فتح صفحة الدفع أو نسخ الرابط.'
          }
          icon={ShieldCheck}
        />

        <label className="flex flex-col gap-2">
          <span className="text-sm font-black text-slate-900 dark:text-white">المبلغ المدفوع</span>
          <input
            type="number"
            min="50"
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
            <span className="font-mono">{requestId || (issuing ? 'جاري التجهيز…' : 'سيُنشأ عند الاستخدام')}</span>
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

          <div className="mt-5 space-y-2 rounded-[24px] border border-dashed border-slate-200 bg-white px-4 py-4 text-right dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 text-sm font-black text-slate-700 dark:text-slate-200">
              <span>المبلغ المدفوع</span>
              <span>{formatCurrency(grossAmount)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm font-black text-amber-700 dark:text-amber-300">
              <span>رسوم التشغيل</span>
              <span>- {formatCurrency(feeAmount)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 text-sm font-black text-emerald-700 dark:border-slate-700 dark:text-emerald-300">
              <span>الصافي المضاف للمحفظة</span>
              <span>{formatCurrency(netAmount)}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <MetaChip label="طلب موثّق من السيرفر" tone="brand" />
            <MetaChip label="ينزل على نفس الحساب" tone="success" />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
