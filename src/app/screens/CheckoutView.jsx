import React, { useState } from 'react';
import { Accessibility, ArrowRightLeft, Award, Car, Check, CreditCard, Tag } from 'lucide-react';
import { getTripBookability } from '../utils/travel';

function CheckoutView({ trip, seats, passengers, wallet, subscription, onCreateBooking, onSuccess, showToast, openModal }) {
  if (!trip) return null;

  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [hasLuggage, setHasLuggage] = useState(false);
  const [rideToStation, setRideToStation] = useState(false);
  const [needsAccess, setNeedsAccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const subDiscountRate = subscription === 'student' ? 0.15 : subscription === 'vip' ? 0.25 : 0;
  const baseTotal = trip.price * passengers;
  const autoDiscount = Math.floor(baseTotal * subDiscountRate);
  const luggageFee = hasLuggage ? (50 * passengers) : 0;
  const rideFee = rideToStation ? 80 : 0;
  const finalTotalPreview = baseTotal + luggageFee + rideFee - discount - autoDiscount;
  const isWalletSufficient = wallet >= finalTotalPreview;
  const pointsToAwardLater = Math.max(0, Math.floor(Math.max(0, baseTotal - autoDiscount - discount) / 5));
  const tripBookability = getTripBookability(trip);

  const applyPromo = () => {
    if (!promo) return;
    if (promo.toUpperCase() === 'AHLAN50') { setDiscount(50); showToast('تم تفعيل الخصم يا نجم 🎉', 'success'); }
    else if (promo.toUpperCase() === 'EID26') { setDiscount(Math.floor(baseTotal * 0.2)); showToast('عيدية طريقي اتفعلت (خصم 20%) 🌙', 'success'); }
    else if (promo.toUpperCase() === 'SA3EED15') { setDiscount(Math.floor(baseTotal * 0.15)); showToast('أجدع ناس! اتفعل خصم الصعيد 🌴', 'success'); }
    else if (promo.toUpperCase() === 'STUDENT20') { setDiscount(Math.floor(baseTotal * 0.2)); showToast('خصم الطلبة شغال 🎓', 'success'); }
    else { showToast('الكود ده مش شغال أو منتهي', 'error'); setDiscount(0); }
  };

  const handlePayment = async () => {
    const bookability = getTripBookability(trip);
    if (!bookability.canBook) return showToast(bookability.reason, 'error');
    if (!isWalletSufficient) return;
    if (seats.length !== passengers || new Set(seats).size !== passengers) return showToast('عدد المقاعد المختارة لازم يساوي عدد الركاب', 'error');

    setIsProcessing(true);
    try {
      const result = await onCreateBooking({ trip, seatNumbers: seats, passengers, promoCode: promo, hasLuggage, rideToStation, needsAccess });
      if (!result?.ok) return showToast(result?.message || 'حصل خطأ أثناء تأكيد الحجز', 'error');
      onSuccess(result.booking, result.invoice);
    } catch (error) {
      console.error('handlePayment error', error);
      showToast('حصل خطأ أثناء تأكيد الحجز. حاول تاني.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-5 space-y-5 max-w-xl mx-auto w-full">
      <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 shrink-0">تأكيد ودفع 💳</h2>
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden shrink-0">
        <div className="absolute top-1/2 -right-3 w-6 h-6 bg-slate-50 dark:bg-slate-950 rounded-full -translate-y-1/2"></div>
        <div className="absolute top-1/2 -left-3 w-6 h-6 bg-slate-50 dark:bg-slate-950 rounded-full -translate-y-1/2"></div>
        <div className="absolute top-1/2 right-4 left-4 h-px border-t-2 border-dashed border-slate-100 dark:border-slate-700 -translate-y-1/2 z-0"></div>
        <div className="relative z-10 pb-6">
          <div className="flex justify-between font-black text-lg text-slate-800 dark:text-slate-100 mb-1"><span>{trip.from}</span><ArrowRightLeft className="w-5 h-5 text-slate-300" /><span>{trip.to}</span></div>
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400 text-left" dir="ltr">{trip.departureTime} • {trip.date}</div>
        </div>
        <div className="relative z-10 pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="block text-[10px] text-slate-400 mb-1">الشركة والدرجة</span><span className="font-bold text-slate-700 dark:text-slate-200">{trip.company} - {trip.class}</span></div>
            <div className="text-left"><span className="block text-[10px] text-slate-400 mb-1">المقاعد ({passengers})</span><span className="font-bold text-indigo-600 dark:text-indigo-400">{seats.join(', ')}</span></div>
          </div>
        </div>
      </div>

      <div className="space-y-3 shrink-0">
        <div onClick={() => setHasLuggage(!hasLuggage)} className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-colors ${hasLuggage ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}><div className="flex items-center gap-3"><div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${hasLuggage ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}>{hasLuggage && <Check className="w-4 h-4" />}</div><span className="font-bold text-sm text-slate-700 dark:text-slate-200">وزن إضافي (أكثر من 20 كجم) 📦</span></div><span className="font-black text-sm text-indigo-600 dark:text-indigo-400" dir="ltr">+50 ج.م</span></div>
        <div onClick={() => setRideToStation(!rideToStation)} className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-colors ${rideToStation ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}><div className="flex items-center gap-3"><div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${rideToStation ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}>{rideToStation && <Check className="w-4 h-4" />}</div><span className="font-bold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1">احجزلي أوبر للمحطة <Car className="w-4 h-4 text-slate-400" /></span></div><span className="font-black text-sm text-indigo-600 dark:text-indigo-400" dir="ltr">+80 ج.م</span></div>
        <div onClick={() => setNeedsAccess(!needsAccess)} className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-colors ${needsAccess ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}><div className="flex items-center gap-3"><div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${needsAccess ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}>{needsAccess && <Check className="w-4 h-4" />}</div><span className="font-bold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1">طلب مساعدة بالصعود / كرسي متحرك <Accessibility className="w-4 h-4 text-emerald-500" /></span></div><span className="font-black text-sm text-emerald-600 dark:text-emerald-400">مجاناً</span></div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-700 flex shrink-0">
        <div className="flex-1 relative"><Tag className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" /><input type="text" placeholder="عندك كود خصم؟" value={promo} onChange={(e) => setPromo(e.target.value)} className="w-full bg-transparent h-12 pr-10 pl-3 text-base text-right font-bold outline-none dark:text-white uppercase" /></div>
        <button onClick={applyPromo} className="bg-slate-900 dark:bg-indigo-600 text-white px-5 rounded-xl font-bold text-sm hover:opacity-90 transition">تفعيل</button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 shrink-0">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-slate-400" /> الحساب كام؟</h3>
        <div className="space-y-3 text-sm font-bold">
          <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>تذاكر x {passengers}</span><span dir="ltr">{baseTotal} ج.م</span></div>
          {luggageFee > 0 && <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>وزن إضافي</span><span dir="ltr">{luggageFee} ج.م</span></div>}
          {rideFee > 0 && <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>أوبر للمحطة</span><span dir="ltr">{rideFee} ج.م</span></div>}
          {autoDiscount > 0 && <div className="flex justify-between text-emerald-500"><span>خصم الباقة ({subscription === 'vip' ? 'VIP' : 'طالب'})</span><span dir="ltr">-{autoDiscount} ج.م</span></div>}
          {discount > 0 && <div className="flex justify-between text-emerald-500"><span>كود خصم</span><span dir="ltr">-{discount} ج.م</span></div>}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between font-black text-xl text-slate-900 dark:text-white"><span>المطلوب دفعه</span><span className="text-indigo-600 dark:text-indigo-400" dir="ltr">{finalTotalPreview} ج.م</span></div>
          <div className="text-[10px] text-center text-slate-400 bg-slate-50 dark:bg-slate-900 py-1.5 rounded-lg flex items-center justify-center gap-1"><Award className="w-3 h-3 text-indigo-500" /> هتاخد {pointsToAwardLater} نقطة ولاء بعد ما الرحلة تنتهي</div>
          <div className="text-[10px] text-center text-slate-500 bg-indigo-50 dark:bg-indigo-900/20 py-1.5 rounded-lg">السعر النهائي والكود بيتأكدوا من السيرفر لحظة الدفع</div>
        </div>
      </div>

      {!tripBookability.canBook && <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-4 text-center"><p className="text-sm font-bold text-rose-600 dark:text-rose-400">{tripBookability.reason}</p><p className="text-[11px] text-rose-500/80 mt-2">اختر رحلة أبعد من موعد التحرك بساعتين على الأقل.</p></div>}
      {!isWalletSufficient && <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-4 text-center"><p className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2">رصيد محفظتك ({wallet} ج.م) مش مكفي.</p><button onClick={() => openModal('topup')} className="text-indigo-600 dark:text-indigo-400 font-black text-sm underline underline-offset-2">اشحن المحفظة دلوقتي من هنا 💳</button></div>}

      <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-950 dark:via-slate-950 py-4 pb-8 z-20 pointer-events-none">
        <button onClick={handlePayment} disabled={!isWalletSufficient || isProcessing || !tripBookability.canBook} className={`w-full max-w-[400px] mx-auto font-black text-lg py-4 rounded-2xl transition-all shadow-lg flex justify-center items-center gap-2 pointer-events-auto ${isWalletSufficient && !isProcessing && tripBookability.canBook ? 'bg-indigo-600 text-white shadow-indigo-600/30 active:scale-95' : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
          {isProcessing ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <>ادفع من المحفظة وأكد الحجز</>}
        </button>
      </div>
    </div>
  );
}

export default CheckoutView;
