import React from 'react';
import { Crown, X } from 'lucide-react';
import { getLocalDateInputValue } from '../utils/travel';

function SubscriptionsModal({ closeModal, wallet, setWallet, setTransactions, subscription, setSubscription, showToast }) {
  const handleBuy = (subType, price) => {
    if(wallet < price) return showToast('رصيدك مش مكفي، اشحن الأول.', 'error');
    setWallet(p => p - price);
    setTransactions(p => [{ id: `TXN-${Math.random().toString(36).substr(2,6).toUpperCase()}`, type: 'debit', amount: price, date: getLocalDateInputValue(), desc: `اشتراك باقة ${subType==='student'?'الطالب':'VIP'}` }, ...p]);
    setSubscription(subType);
    showToast('تم تفعيل الباقة بنجاح! استمتع بالخصم الثابت 🎉', 'success');
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-down">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[400px] rounded-[2.5rem] p-8 shadow-2xl relative">
        <button onClick={closeModal} className="absolute top-6 left-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X className="w-5 h-5"/></button>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2"><Crown className="w-8 h-8 text-amber-500"/> باقات التوفير</h3>
        <p className="text-sm font-bold text-slate-500 mb-8">اشترك دلوقتي ووفر على كل رحلاتك خلال الشهر.</p>
        
        <div className="space-y-4">
           {/* Student Pass */}
           <div className={`p-5 rounded-2xl border-2 ${subscription === 'student' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
              <div className="flex justify-between items-start mb-4">
                 <div><h4 className="font-black text-slate-800 dark:text-white text-lg">باقة الطالب 🎓</h4><p className="text-xs text-slate-500 mt-1">خصم 15% على كل رحلاتك</p></div>
                 <div className="text-xl font-black text-indigo-600 dark:text-indigo-400" dir="ltr">100 ج.م</div>
              </div>
              {subscription === 'student' ? <span className="text-sm font-black text-indigo-600 bg-indigo-100 px-4 py-2 rounded-xl block text-center">باقة مفعلة 🟢</span> : <button onClick={()=>handleBuy('student', 100)} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl text-sm transition active:scale-95">اشترك الآن</button>}
           </div>

           {/* VIP Pass */}
           <div className={`p-5 rounded-2xl border-2 ${subscription === 'vip' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-amber-100 dark:border-amber-900/40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10'}`}>
              <div className="flex justify-between items-start mb-4">
                 <div><h4 className="font-black text-amber-900 dark:text-amber-400 text-lg">باقة كبار الزوار 👑</h4><p className="text-xs text-amber-700/70 dark:text-amber-500/70 mt-1">خصم 25% + تعديل مجاني</p></div>
                 <div className="text-xl font-black text-amber-600" dir="ltr">300 ج.م</div>
              </div>
              {subscription === 'vip' ? <span className="text-sm font-black text-amber-600 bg-amber-100 px-4 py-2 rounded-xl block text-center">باقة مفعلة 🟢</span> : <button onClick={()=>handleBuy('vip', 300)} className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl text-sm shadow-md shadow-amber-500/30 transition active:scale-95">اشترك الآن</button>}
           </div>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionsModal;
