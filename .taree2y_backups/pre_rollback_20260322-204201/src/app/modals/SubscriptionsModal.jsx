import { Crown } from 'lucide-react';
import { ModalShell, SoftBadge } from '../components/ui/Taree2yUI';
import { getLocalDateInputValue } from '../utils/travel';

function SubscriptionsModal({
  closeModal,
  wallet,
  setWallet,
  setTransactions,
  subscription,
  setSubscription,
  showToast,
}) {
  const handleBuy = (subType, price) => {
    if (wallet < price) return showToast('رصيدك مش مكفي، اشحن الأول.', 'error');
    setWallet((prev) => prev - price);
    setTransactions((prev) => [
      {
        id: `TXN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        type: 'debit',
        amount: price,
        date: getLocalDateInputValue(),
        desc: `اشتراك باقة ${subType === 'student' ? 'الطالب' : 'VIP'}`,
      },
      ...prev,
    ]);
    setSubscription(subType);
    showToast('تم تفعيل الباقة بنجاح! استمتع بالخصم الثابت 🎉', 'success');
    closeModal();
  };

  return (
    <ModalShell
      tone="amber"
      title="باقات التوفير"
      subtitle="خلي كل رحلة أوفر، خصوصًا لو بتسافر باستمرار أو بتتحرك بين المحافظات كتير."
      icon={<Crown />}
      closeModal={closeModal}
      maxWidth="max-w-[480px]"
    >
      <div className="space-y-4">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="text-sm font-black text-slate-900 dark:text-white">
            رصيد المحفظة الحالي
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white" dir="ltr">
            {wallet} ج.م
          </div>
        </div>

        <div className={`rounded-[28px] border p-5 ${
          subscription === 'student'
            ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/10'
            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-black text-slate-900 dark:text-white">باقة الطالب 🎓</div>
              <div className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                خصم 15% على كل رحلاتك خلال الشهر.
              </div>
            </div>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-300" dir="ltr">
              100 ج.م
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <SoftBadge tone="indigo" text="الأنسب للتنقل اليومي" />
            {subscription === 'student' ? (
              <SoftBadge tone="emerald" text="مفعلة" />
            ) : (
              <button
                onClick={() => handleBuy('student', 100)}
                className="rounded-[18px] bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:opacity-95 dark:bg-indigo-500"
              >
                اشترك الآن
              </button>
            )}
          </div>
        </div>

        <div className={`rounded-[28px] border p-5 ${
          subscription === 'vip'
            ? 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10'
            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-black text-slate-900 dark:text-white">باقة كبار الزوار 👑</div>
              <div className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                خصم 25% + مرونة أكبر في الرحلات والتعديلات.
              </div>
            </div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-300" dir="ltr">
              300 ج.م
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <SoftBadge tone="amber" text="الأقوى للرحلات الكتير" />
            {subscription === 'vip' ? (
              <SoftBadge tone="emerald" text="مفعلة" />
            ) : (
              <button
                onClick={() => handleBuy('vip', 300)}
                className="rounded-[18px] bg-amber-500 px-4 py-3 text-sm font-black text-white shadow-[0_20px_50px_-28px_rgba(245,158,11,0.65)] transition hover:opacity-95"
              >
                اشترك الآن
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default SubscriptionsModal;
