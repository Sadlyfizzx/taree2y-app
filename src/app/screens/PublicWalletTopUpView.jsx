import { useMemo, useState } from 'react';
import { CreditCard, ShieldCheck, Smartphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AppSurface, MetaChip, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
import { formatCurrency } from '../utils/formatting';

export default function PublicWalletTopUpView() {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const userId = searchParams.get('uid') || '';
  const requestId = searchParams.get('req') || '';
  const initialAmount = searchParams.get('amount') || '';

  const [amount, setAmount] = useState(initialAmount);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const numericAmount = Math.max(0, Number(amount) || 0);

  const handleTopUp = async () => {
    if (!userId) {
      setStatus('error');
      setMessage('الرابط غير مكتمل. اطلب رابط شحن جديد من التطبيق.');
      return;
    }

    if (numericAmount < 10) {
      setStatus('error');
      setMessage('أقل مبلغ شحن 10 ج.م.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const { error } = await supabase.rpc('public_topup_wallet', {
        p_user_id: userId,
        p_amount: numericAmount,
        p_request_id: requestId || null,
      });

      if (error) throw error;

      setStatus('success');
      setMessage(`تم إضافة ${formatCurrency(numericAmount)} للمحفظة بنجاح.`);
    } catch (error) {
      setStatus('error');
      setMessage(error?.message || 'تعذر تنفيذ الشحن حالياً.');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-lg">
        <AppSurface className="overflow-hidden p-0">
          <div className="bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] px-6 py-6 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-black">شحن محفظة طريقي</p>
                <p className="mt-2 text-sm font-bold text-white/80">افتح الرابط من أي جهاز وأضف الرصيد لنفس الحساب مباشرة.</p>
              </div>
              <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-white/12">
                <Smartphone className="h-6 w-6" />
              </span>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div className="flex flex-wrap gap-2">
              <MetaChip label={requestId || 'TOPUP-LINK'} tone="brand" />
              <MetaChip label="حساب مرتبط بالرابط" tone="success" />
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-sm font-black text-slate-900 dark:text-white">المبلغ</p>
              <input
                type="number"
                min="10"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="اكتب المبلغ"
                className="mt-3 h-14 w-full rounded-[22px] border border-slate-200 bg-white px-4 text-center text-xl font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {[50, 100, 200, 500].map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => setAmount(String(quickAmount))}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {quickAmount} ج.م
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-200">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-black">الرصيد هيدخل مباشرة لنفس الحساب المرتبط بالرابط.</p>
                  <p className="mt-1 text-sm font-bold opacity-90">المبلغ الحالي: {formatCurrency(numericAmount)}</p>
                </div>
              </div>
            </div>

            {message ? (
              <div className={`rounded-[22px] px-4 py-3 text-sm font-black ${status === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' : 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300'}`}>
                {message}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <PrimaryButton onClick={handleTopUp} icon={<CreditCard className="h-5 w-5" />} disabled={status === 'loading'} className="flex-1">
                {status === 'loading' ? 'جاري تأكيد الشحن…' : 'أكّد الشحن'}
              </PrimaryButton>
              <SecondaryButton className="flex-1" onClick={() => window.close()}>
                إغلاق
              </SecondaryButton>
            </div>
          </div>
        </AppSurface>
      </div>
    </div>
  );
}
