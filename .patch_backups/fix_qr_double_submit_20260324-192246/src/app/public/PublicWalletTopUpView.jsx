import React, { useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';
import { AppSurface, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
import { formatCurrency } from '../utils/formatting';
import { getOrCreatePublicClientId, publicTopupWallet } from './publicPortal';

function Shell({ children }) {
  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50" dir="rtl">
      <div className="mx-auto max-w-xl space-y-5">{children}</div>
    </div>
  );
}

export default function PublicWalletTopUpView() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const userId = params.get('uid') || '';
  const grossAmount = Number(params.get('amount') || 0);
  const feeAmount = Number(params.get('fee') || 0);
  const creditAmount = Number(params.get('credit') || 0);
  const requestId = params.get('req') || '';

  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const isReady = Boolean(userId && requestId && creditAmount > 0);
  const clientId = useMemo(() => getOrCreatePublicClientId(), []);

  const handleConfirm = async () => {
    if (!isReady || status === 'loading') return;

    setStatus('loading');
    setMessage('');

    try {
      await publicTopupWallet({
        userId,
        amount: creditAmount,
        requestId,
        paymentChannel: 'public_qr_net',
        clientId,
      });
      setStatus('success');
      setMessage('تم تأكيد الشحن بنجاح. ارجع للتطبيق وستجد صافي المبلغ مضافاً لنفس الحساب.');
    } catch (error) {
      setStatus('error');
      setMessage(error?.message || 'تعذر تأكيد عملية الشحن حالياً.');
    }
  };

  return (
    <Shell>
      <section className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] p-6 text-white shadow-[0_30px_60px_-36px_rgba(16,35,63,0.6)]">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.22), transparent 28%)' }} />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-white/70">شحن محفظة طريقي</p>
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
                <span className="font-mono text-slate-900 dark:text-white">{requestId || '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>معرّف العميل</span>
                <span className="font-mono text-slate-900 dark:text-white">{clientId}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              <p className="text-sm font-black text-slate-900 dark:text-white">العملية مرتبطة بنفس الحساب</p>
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">يمكنك فتح الصفحة من أي جهاز، وسيتم إضافة الشحن إلى محفظة نفس المستخدم فقط.</p>
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
          <PrimaryButton onClick={handleConfirm} disabled={!isReady || status === 'loading'}>
            {status === 'loading' ? 'جاري التأكيد…' : 'تأكيد الشحن'}
          </PrimaryButton>
        </div>
      </AppSurface>
    </Shell>
  );
}
