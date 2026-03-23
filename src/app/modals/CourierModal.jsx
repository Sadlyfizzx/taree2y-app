import React, { useState } from 'react';
import { Package } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { MetaChip, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
import { CITIES, DIRECT_ROUTES, getLocalDateInputValue } from '../utils/travel';
import { formatCurrency } from '../utils/formatting';

function CourierModal({ closeModal, wallet, setWallet, setTransactions, showToast }) {
  const [loading, setLoading] = useState(false);
  const [weight, setWeight] = useState('');
  const [provider, setProvider] = useState('taree2y');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');

  const calculatePrice = () => {
    if (!fromCity || !toCity || !weight) return 0;
    const baseDistance = DIRECT_ROUTES[`${fromCity}-${toCity}`] || 150;
    const weightCost = Number(weight) * 5;
    const providerCost = provider === 'super' ? 40 : 0;
    return Math.floor(baseDistance * 0.4 + weightCost + providerCost);
  };

  const finalPrice = calculatePrice();

  const handleSend = () => {
    if (!fromCity || !toCity || !weight) {
      showToast('كمّل بيانات الطرد الأول.', 'error');
      return;
    }

    if (wallet < finalPrice) {
      showToast('رصيد المحفظة مش مكفي لطلب الطرد.', 'error');
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      setWallet((currentValue) => currentValue - finalPrice);
      setTransactions((currentValue) => [
        {
          id: `COURIER-${Date.now()}`,
          type: 'debit',
          amount: finalPrice,
          date: getLocalDateInputValue(),
          desc: `شحنة من ${fromCity} إلى ${toCity}`,
        },
        ...currentValue,
      ]);
      showToast(`تم تسجيل طلب الطرد وخصم ${finalPrice} ج.م.`, 'success');
      setLoading(false);
      closeModal();
    }, 800);
  };

  return (
    <ModalShell
      onClose={closeModal}
      title="طريقي للشحن"
      subtitle="واجهة أوضح لتسجيل الطرد ومعرفة السعر قبل التأكيد."
      icon={<Package className="h-6 w-6" />}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={closeModal}>إلغاء</SecondaryButton>
          <PrimaryButton onClick={handleSend} disabled={loading || !finalPrice}>
            {loading ? 'جاري التسجيل…' : `أكد الطلب ${finalPrice ? `(${formatCurrency(finalPrice)})` : ''}`}
          </PrimaryButton>
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-black text-slate-900 dark:text-white">من محافظة</span>
            <select value={fromCity} onChange={(event) => setFromCity(event.target.value)} className="h-14 rounded-[22px] border border-slate-200 bg-slate-50 px-4 font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
              <option value="">اختار المحافظة</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-black text-slate-900 dark:text-white">إلى محافظة</span>
            <select value={toCity} onChange={(event) => setToCity(event.target.value)} className="h-14 rounded-[22px] border border-slate-200 bg-slate-50 px-4 font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
              <option value="">اختار المحافظة</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-black text-slate-900 dark:text-white">الوزن بالكيلو</span>
            <input type="number" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="مثال: 5" className="h-14 rounded-[22px] border border-slate-200 bg-slate-50 px-4 font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">سرعة التوصيل</p>
            <div className="mt-3 space-y-3">
              <button type="button" onClick={() => setProvider('taree2y')} className={`w-full rounded-[24px] border px-4 py-4 text-right transition ${provider === 'taree2y' ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                <p className="text-sm font-black text-slate-900 dark:text-white">عادي</p>
                <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">من يومين لثلاثة أيام</p>
              </button>
              <button type="button" onClick={() => setProvider('super')} className={`w-full rounded-[24px] border px-4 py-4 text-right transition ${provider === 'super' ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                <p className="text-sm font-black text-slate-900 dark:text-white">سوبر</p>
                <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">خلال 24 ساعة تقريبًا</p>
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/60">
            <p className="text-sm font-black text-slate-900 dark:text-white">السعر التقديري</p>
            <p className="mt-2 text-2xl font-black text-indigo-700 dark:text-indigo-300">{formatCurrency(finalPrice)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <MetaChip label="تسعير تقريبي" tone="brand" />
              <MetaChip label="يدفع من المحفظة" tone="success" />
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default CourierModal;
