import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, ShieldCheck, TriangleAlert } from 'lucide-react';
import { AppSurface, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
import { formatCurrency } from '../utils/formatting';
import {
  buildWalletTopupClientId,
  confirmPublicWalletTopupRequest,
  getPublicWalletTopupRequest,
  markWalletTopupPaid,
  readWalletTopupPaidState,
} from './publicPortal';

function Shell({ children }) {
  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50" dir="rtl">
      <div className="mx-auto max-w-xl space-y-5">{children}</div>
    </div>
  );
}

function matchesPaidState(paidState, requestData) {
  if (!paidState?.paid || !requestData?.requestId) return false;
  return String(paidState.requestId || '').trim() === String(requestData.requestId || '').trim();
}

function getErrorMessage(error) {
  const payload = JSON.stringify({
    message: error?.message || '',
    details: error?.details || '',
    hint: error?.hint || '',
    code: error?.code || '',
  }).toLowerCase();

  if (payload.includes('get_public_wallet_topup_request')) {
    return 'ميزة طلبات الشحن الآمنة محتاجة SQL pass 3 على Supabase قبل استخدام روابط الـ QR الجديدة.';
  }

  if (payload.includes('confirm_public_wallet_topup_request')) {
    return 'تأكيد الشحن الآمن محتاج SQL pass 3 على Supabase قبل ما العملية تشتغل بشكل صحيح.';
  }

  if (payload.includes('expired')) {
    return 'رابط الشحن انتهت صلاحيته. ارجع للتطبيق وطلّع رابط جديد.';
  }

  return 'تعذر تأكيد الشحن حالياً. جرّب رابط جديد من داخل التطبيق.';
}

export default function PublicWalletTopUpView() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const requestId = String(params.get('req') || '').trim();

  const [requestData, setRequestData] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(Boolean(requestId));
  const [status, setStatus] = useState(requestId ? 'idle' : 'error');
  const [message, setMessage] = useState(
    requestId ? '' : 'رابط الشحن غير صالح أو ناقص. اطلب رابط جديد من داخل التطبيق.'
  );

  const clientId = useMemo(() => buildWalletTopupClientId(requestId), [requestId]);

  useEffect(() => {
    let active = true;

    if (!requestId) {
      setLoadingRequest(false);
      setStatus('error');
      setMessage('رابط الشحن غير صالح أو ناقص. اطلب رابط جديد من داخل التطبيق.');
      return () => {
        active = false;
      };
    }

    (async () => {
      setLoadingRequest(true);
      try {
        const nextRequest = await getPublicWalletTopupRequest(requestId);
        if (!active) return;

        if (!nextRequest) {
          setRequestData(null);
          setStatus('error');
          setMessage('الطلب ده غير موجود أو تم إلغاؤه. ارجع للتطبيق وطلّع رابط شحن جديد.');
          return;
        }

        setRequestData(nextRequest);

        const paidState = readWalletTopupPaidState(nextRequest.requestId);
        if (matchesPaidState(paidState, nextRequest) || nextRequest.isPaid) {
          setStatus('success');
          setMessage('العملية دي اتدفعت بالفعل قبل كده وتم احتسابها على نفس الحساب.');
        } else {
          setStatus('idle');
          setMessage('');
        }
      } catch (error) {
        if (!active) return;
        setRequestData(null);
        setStatus('error');
        setMessage(getErrorMessage(error));
      } finally {
        if (active) setLoadingRequest(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [requestId]);

  const actionLabel = loadingRequest
    ? 'جاري تجهيز الطلب…'
    : status == 'loading'
    ? 'جاري تأكيد الدفع…'
    : status == 'success'
    ? 'تم التأكيد'
    : 'تأكيد الدفع الآن';

  const isReady = Boolean(requestData && !loadingRequest && status !== 'loading' && status !== 'success');
  const grossAmount = Number(requestData?.grossAmount || 0);
  const feeAmount = Number(requestData?.feeAmount || 0);
  const creditAmount = Number(requestData?.creditAmount || 0);
  const statusCardTone = requestData ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20';

  const handleConfirm = async () => {
    if (!requestData || status === 'loading' || status === 'success') return;

    setStatus('loading');
    setMessage('');

    try {
      const result = await confirmPublicWalletTopupRequest({
        requestId: requestData.requestId,
        paymentChannel: requestData.paymentChannel || 'public_qr',
        clientId,
      });

      const nextRequest = result?.request || requestData;
      setRequestData(nextRequest);
      markWalletTopupPaid(nextRequest.requestId, {
        userId: nextRequest.userId,
        grossAmount: nextRequest.grossAmount,
        feeAmount: nextRequest.feeAmount,
        creditAmount: nextRequest.creditAmount,
        clientId,
      });
      setStatus('success');
      setMessage(
        result?.alreadyPaid
          ? 'العملية دي كانت متأكدة بالفعل وتم منع التكرار.'
          : result?.message || 'تم تأكيد الدفع وإضافة صافي المبلغ للمحفظة بنجاح.'
      );
    } catch (error) {
      setStatus('error');
      setMessage(getErrorMessage(error));
    }
  };

  return (
    <Shell>
      <section className="rounded-[32px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] p-5 text-white shadow-[0_24px_60px_-34px_rgba(16,35,63,0.52)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-white/70">شحن محفظة طريقي</p>
            <h1 className="mt-3 text-3xl font-black">{formatCurrency(grossAmount)}</h1>
            <p className="mt-2 text-sm font-bold text-white/80">سيتم إضافة صافي المبلغ مباشرة لنفس الحساب بعد خصم رسوم التشغيل.</p>
          </div>
          <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-white/12 text-white">
            <CreditCard className="h-7 w-7" />
          </span>
        </div>
      </section>

      <AppSurface className="p-5">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-sm font-black text-slate-900 dark:text-white">تفاصيل العملية</p>
            <div className="mt-3 space-y-2 text-sm font-bold text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between gap-3">
                <span>المبلغ المدفوع</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(grossAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>رسوم التشغيل</span>
                <span className="text-amber-700 dark:text-amber-300">- {formatCurrency(feeAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-800">
                <span>الصافي المضاف للمحفظة</span>
                <span className="text-emerald-700 dark:text-emerald-300">{formatCurrency(creditAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>رقم العملية</span>
                <span className="font-mono text-slate-900 dark:text-white">{requestData?.requestId || requestId || '—'}</span>
              </div>
            </div>
          </div>

          <div className={`rounded-[24px] border px-4 py-4 ${statusCardTone}`}>
            <div className="flex items-center gap-2">
              {requestData ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              ) : (
                <TriangleAlert className="h-5 w-5 text-amber-700 dark:text-amber-300" />
              )}
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {requestData ? 'الطلب صادر من السيرفر ومربوط بنفس الحساب' : 'الرابط محتاج إعادة إصدار'}
              </p>
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
              {requestData
                ? 'الصفحة بتقرأ الطلب من السيرفر مباشرة. تغيير أي باراميتر في الرابط لن ينشئ طلبًا جديدًا.'
                : 'رقم العملية غير معروف على السيرفر أو انتهت صلاحيته. ارجع للتطبيق وطلّع رابط جديد.'}
            </p>
          </div>

          {message ? (
            <div className={`rounded-[24px] border px-4 py-4 text-sm font-black ${status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300'}`}>
              {status === 'success' ? <CheckCircle2 className="ml-2 inline h-4 w-4" /> : null}
              {message}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={() => window.close()}>إغلاق</SecondaryButton>
          <PrimaryButton onClick={handleConfirm} disabled={!isReady}>
            {actionLabel}
          </PrimaryButton>
        </div>
      </AppSurface>
    </Shell>
  );
}
