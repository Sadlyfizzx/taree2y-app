import { useEffect, useState } from 'react';
import { CreditCard, QrCode, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { readWalletTopupRequestFromLocation } from '../utils/publicLinks';
import { formatCurrency } from '../utils/formatting';

const QUICK_AMOUNTS = [100, 200, 500, 1000];

export default function PublicTopUpPage() {
  const { requestId, token } = readWalletTopupRequestFromLocation();
  const [amount, setAmount] = useState('');
  const [payerLabel, setPayerLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [requestInfo, setRequestInfo] = useState(null);

  const numericAmount = Math.max(0, Number(amount) || 0);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!requestId || !token) {
        setErrorMessage('رابط الشحن غير مكتمل.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_wallet_topup_request_public', {
        p_request_id: requestId,
        p_public_token: token,
      });

      if (!active) return;

      if (error) {
        setErrorMessage(error.message || 'تعذر تحميل طلب الشحن.');
        setLoading(false);
        return;
      }

      setRequestInfo(Array.isArray(data) ? data[0] : data);
      setLoading(false);
    };

    run();

    return () => {
      active = false;
    };
  }, [requestId, token]);

  const handlePay = async () => {
    if (numericAmount < 50) {
      setErrorMessage('أقل مبلغ شحن 50 ج.م.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const { data, error } = await supabase.rpc('complete_wallet_topup_request', {
      p_request_id: requestId,
      p_public_token: token,
      p_amount: numericAmount,
      p_payer_label: payerLabel || 'QR wallet top-up',
    });

    if (error) {
      setErrorMessage(error.message || 'تعذر إتمام الشحن حالياً.');
      setSubmitting(false);
      return;
    }

    const payload = Array.isArray(data) ? data[0] : data;
    setStatus(payload || { ok: true, amount: numericAmount });
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-6 dark:bg-slate-950" dir="rtl">
      <div className="mx-auto max-w-2xl space-y-5">
        <section className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] p-6 text-white shadow-[0_30px_60px_-36px_rgba(16,35,63,0.6)]">
          <div className="flex items-start gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-[26px] bg-white/12 text-white">
              <QrCode className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-white/70">شحن مرتبط بالحساب</p>
              <h1 className="mt-2 text-3xl font-black">QR شحن محفظة طريقي</h1>
              <p className="mt-3 text-sm font-bold leading-7 text-white/80">الرصيد اللي هيتحول هنا هيتسجل للحساب المرتبط بطلب الشحن، حتى لو تم فتح الصفحة من جهاز مختلف.</p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 text-center text-sm font-black text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            جاري تحميل طلب الشحن…
          </div>
        ) : errorMessage && !status ? (
          <div className="rounded-[32px] border border-rose-200 bg-rose-50 p-6 text-center text-sm font-black text-rose-700 shadow-sm dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
            {errorMessage}
          </div>
        ) : status?.ok ? (
          <div className="rounded-[32px] border border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                <Wallet className="h-6 w-6" />
              </span>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">تم الشحن بنجاح</p>
                <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{formatCurrency(status.amount || numericAmount)} اتضافت للمحفظة المرتبطة بالطلب.</p>
              </div>
            </div>
          </div>
        ) : (
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">المبلغ</p>
                <input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="اكتب مبلغ الشحن"
                  className="mt-3 h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-xl font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((quickAmount) => (
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
              </div>

              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">اسم أو وصف العملية (اختياري)</p>
                <input
                  type="text"
                  value={payerLabel}
                  onChange={(event) => setPayerLabel(event.target.value)}
                  placeholder="مثال: شحن من الموبايل"
                  className="mt-3 h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/60">
                  <p className="text-sm font-black text-slate-900 dark:text-white">طلب الشحن الحالي</p>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-500 dark:text-slate-400">الكود ده مربوط بنفس الحساب الذي أنشأ QR. بعد التأكيد، الرصيد هيظهر في التطبيق على حسابه.</p>
                  <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <span dir="ltr">{requestInfo?.request_id || requestId}</span>
                  </div>
                </div>
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-5 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handlePay}
              disabled={submitting}
              className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-indigo-600 px-4 text-base font-black text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
            >
              <CreditCard className="h-5 w-5" />
              {submitting ? 'جاري تنفيذ الشحن…' : `أكّد شحن ${formatCurrency(numericAmount)}`}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
