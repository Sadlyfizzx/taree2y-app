import { useState } from 'react';
import { CheckCircle2, Package } from 'lucide-react';
import { ModalShell } from '../components/ui/Taree2yUI';
import { CITIES, DIRECT_ROUTES, getLocalDateInputValue } from '../utils/travel';

function CourierModal({ closeModal, wallet, setWallet, setTransactions, showToast }) {
  const [loading, setLoading] = useState(false);
  const [weight, setWeight] = useState('');
  const [provider, setProvider] = useState('taree2y');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');

  const calculatePrice = () => {
    if (!fromCity || !toCity || !weight) return 0;
    const baseDist = DIRECT_ROUTES[`${fromCity}-${toCity}`] || 150;
    const weightCost = Number(weight) * 5;
    const provCost = provider === 'super' ? 40 : 0;
    return Math.floor(baseDist * 0.4 + weightCost + provCost);
  };

  const finalPrice = calculatePrice();

  const handleSend = () => {
    if (!fromCity || !toCity || !weight) return showToast('أكمل البيانات الأول من فضلك', 'error');
    if (wallet < finalPrice) return showToast('الرصيد في المحفظة مش مكفي، اشحن الأول.', 'error');

    setLoading(true);
    setTimeout(() => {
      setWallet((prev) => prev - finalPrice);
      setTransactions((prev) => [
        {
          id: `TXN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          type: 'debit',
          amount: finalPrice,
          date: getLocalDateInputValue(),
          desc: `طرد من ${fromCity} لـ ${toCity}`,
        },
        ...prev,
      ]);
      showToast(`تم تسجيل الطرد بنجاح! خصمنا ${finalPrice} ج.م 📦`, 'success');
      setLoading(false);
      closeModal();
    }, 1500);
  };

  return (
    <ModalShell
      tone="amber"
      title="طريقي إكسبريس"
      subtitle="ابعت طرودك لأي محافظة بسرعة وأمان، والدفع يتم من المحفظة التجريبية."
      icon={<Package />}
      closeModal={closeModal}
      maxWidth="max-w-[560px]"
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={fromCity}
            onChange={(e) => setFromCity(e.target.value)}
            className="h-14 w-full rounded-[22px] border border-slate-200 bg-white px-4 text-base font-black text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">من محافظة</option>
            {CITIES.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>

          <select
            value={toCity}
            onChange={(e) => setToCity(e.target.value)}
            className="h-14 w-full rounded-[22px] border border-slate-200 bg-white px-4 text-base font-black text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">إلى محافظة</option>
            {CITIES.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </div>

        <input
          type="number"
          placeholder="وزن الطرد بالتقريب (كجم)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="h-14 w-full rounded-[22px] border border-slate-200 bg-white px-4 text-base font-black text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />

        <div className="space-y-3">
          <button
            onClick={() => setProvider('taree2y')}
            className={`w-full rounded-[24px] border p-4 text-right transition ${
              provider === 'taree2y'
                ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/10'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-900 dark:text-white">توصيل عادي</div>
                <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  خلال يومين إلى 3 أيام • أوفر اختيار
                </div>
              </div>
              {provider === 'taree2y' ? <CheckCircle2 className="h-5 w-5 text-indigo-500" /> : null}
            </div>
          </button>

          <button
            onClick={() => setProvider('super')}
            className={`w-full rounded-[24px] border p-4 text-right transition ${
              provider === 'super'
                ? 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-900 dark:text-white">توصيل سوبر</div>
                <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  خلال 24 ساعة • +40 ج.م
                </div>
              </div>
              {provider === 'super' ? <CheckCircle2 className="h-5 w-5 text-amber-500" /> : null}
            </div>
          </button>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="text-sm font-black text-slate-900 dark:text-white">السعر المتوقع</div>
          <div className="mt-2 text-3xl font-black text-indigo-600 dark:text-indigo-300" dir="ltr">
            {finalPrice || 0} ج.م
          </div>
          <div className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            الرصيد الحالي: <span dir="ltr">{wallet} ج.م</span>
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={loading || !finalPrice}
          className={`flex h-14 w-full items-center justify-center rounded-[24px] text-base font-black transition ${
            finalPrice
              ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_24px_54px_-28px_rgba(79,70,229,0.8)] active:scale-[0.99]'
              : 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
          }`}
        >
          {loading ? 'جاري تسجيل الطلب...' : `أكد الطلب وادفع (${finalPrice || 0} ج.م)`}
        </button>
      </div>
    </ModalShell>
  );
}

export default CourierModal;
