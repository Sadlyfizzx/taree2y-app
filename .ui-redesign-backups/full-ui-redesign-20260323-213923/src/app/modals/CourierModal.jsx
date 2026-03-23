import React from 'react';
import { useState } from 'react';
import { CheckCircle2, Package, X } from 'lucide-react';
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
     return Math.floor((baseDist * 0.4) + weightCost + provCost);
  };

  const finalPrice = calculatePrice();

  const handleSend = () => {
     if(!fromCity || !toCity || !weight) return showToast('أكمل البيانات الأول من فضلك', 'error');
     if(wallet < finalPrice) return showToast('الرصيد في المحفظة مش مكفي، اشحن الأول.', 'error');
     
     setLoading(true);
     setTimeout(() => {
        setWallet(p => p - finalPrice);
        setTransactions(p => [{ id: `TXN-${Math.random().toString(36).substr(2,6).toUpperCase()}`, type: 'debit', amount: finalPrice, date: getLocalDateInputValue(), desc: `طرد من ${fromCity} لـ ${toCity}` }, ...p]);
        showToast(`تم تسجيل الطرد بنجاح! خصمنا ${finalPrice} ج.م 📦`, 'success');
        setLoading(false); closeModal();
     }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-down">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[500px] rounded-[2.5rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto hide-scrollbar">
        <button onClick={closeModal} className="absolute top-6 left-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X className="w-5 h-5"/></button>
        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-6"><Package className="w-7 h-7"/></div>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">طريقي إكسبريس 📦</h3>
        <p className="text-sm font-bold text-slate-500 mb-8">ابعت طرودك لأي محافظة في مصر بسرعة وأمان وتكلفة على قد الإيد.</p>
        
        <div className="space-y-4 mb-8">
           <div className="flex gap-3">
             <select value={fromCity} onChange={e=>setFromCity(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl h-14 px-4 text-base font-bold outline-none appearance-none dark:text-white focus:border-indigo-500">
                <option value="">من محافظة</option>{CITIES.map(c=><option key={c}>{c}</option>)}
             </select>
             <select value={toCity} onChange={e=>setToCity(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl h-14 px-4 text-base font-bold outline-none appearance-none dark:text-white focus:border-indigo-500">
                <option value="">إلى محافظة</option>{CITIES.map(c=><option key={c}>{c}</option>)}
             </select>
           </div>
           
           <input type="number" placeholder="وزن الطرد بالتقريب (كجم)" value={weight} onChange={e=>setWeight(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl h-14 px-4 text-base font-bold outline-none focus:border-indigo-500 dark:text-white placeholder:font-normal" />
           
           <div className="space-y-2 mt-4">
              <h4 className="font-bold text-sm text-slate-500 px-1 mb-2">اختار سرعة التوصيل</h4>
              <div onClick={()=>setProvider('taree2y')} className={`p-4 rounded-xl border-2 flex justify-between cursor-pointer transition-colors ${provider==='taree2y' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20':'border-slate-100 dark:border-slate-800'}`}>
                 <div><span className="font-bold block dark:text-white">توصيل عادي (يومين لـ 3 أيام)</span><span className="text-xs text-slate-500">سعر اقتصادي ومناسب</span></div>
                 {provider==='taree2y' && <CheckCircle2 className="w-5 h-5 text-indigo-600"/>}
              </div>
              <div onClick={()=>setProvider('super')} className={`p-4 rounded-xl border-2 flex justify-between cursor-pointer transition-colors ${provider==='super' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20':'border-slate-100 dark:border-slate-800'}`}>
                 <div><span className="font-bold block dark:text-white">توصيل سوبر (خلال 24 ساعة)</span><span className="text-xs text-amber-600 dark:text-amber-400">أسرع توصيل متاح (+40 ج.م)</span></div>
                 {provider==='super' && <CheckCircle2 className="w-5 h-5 text-amber-500"/>}
              </div>
           </div>
        </div>

        <button onClick={handleSend} disabled={loading || !finalPrice} className={`w-full text-white font-black text-lg py-4 rounded-2xl shadow-lg transition-transform flex justify-center items-center gap-2 ${finalPrice ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-600/30' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'}`}>
          {loading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : finalPrice ? `أكد الطلب وادفع (${finalPrice} ج.م)` : 'أكمل البيانات لمعرفة السعر'}
        </button>
      </div>
    </div>
  );
}

export default CourierModal;
